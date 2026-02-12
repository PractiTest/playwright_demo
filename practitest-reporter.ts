import type {
  Reporter,
  FullConfig,
  Suite,
  TestCase,
  TestResult,
  FullResult,
} from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';

interface PractiTestConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
  projectId: string;
  suiteId?: string;
}

class PractiTestReporter implements Reporter {
  private config: PractiTestConfig;
  private pendingUploads: Promise<void>[] = [];

  constructor() {
    // Try to load from JSON file first, then fall back to environment variables
    this.config = this.loadConfig();

    // Validate configuration
    if (!this.config.email || !this.config.apiToken || !this.config.projectId) {
      console.warn('[PractiTest] Warning: PractiTest credentials not configured. Set PRACTITEST_EMAIL, PRACTITEST_API_TOKEN, and PRACTITEST_PROJECT_ID environment variables or create practitest.config.json file.');
    }
  }

  private loadConfig(): PractiTestConfig {
    // Try to load from JSON file first
    const configPath = path.join(process.cwd(), 'practitest.config.json');

    if (fs.existsSync(configPath)) {
      try {
        const fileContent = fs.readFileSync(configPath, 'utf-8');
        const jsonConfig = JSON.parse(fileContent);
        console.log('[PractiTest] Loaded configuration from practitest.config.json');
        return {
          baseUrl: jsonConfig.baseUrl || '',
          email: jsonConfig.email || '',
          apiToken: jsonConfig.apiToken || '',
          projectId: jsonConfig.projectId || '',
          suiteId: jsonConfig.suite_id || '',
        };
      } catch (error) {
        console.warn('[PractiTest] Warning: Failed to parse practitest.config.json, falling back to environment variables');
      }
    }

    // Fall back to environment variables
    return {
      baseUrl: process.env.PRACTITEST_BASE_URL || '',
      email: process.env.PRACTITEST_EMAIL || '',
      apiToken: process.env.PRACTITEST_API_TOKEN || '',
      projectId: process.env.PRACTITEST_PROJECT_ID || '',
      suiteId: process.env.PRACTITEST_SUITE_ID || '',
    };
  }

  onBegin(config: FullConfig, suite: Suite) {
    console.log(`[PractiTest] Starting test run with ${suite.allTests().length} tests`);
  }

  async onTestEnd(test: TestCase, result: TestResult) {
    // Get instance ID from test annotations
    console.warn('onTestEnd -> updateing PT');
    const instanceIdAnnotation = test.annotations.find(
      (annotation) => annotation.type === 'instanceId'
    );

    // Map Playwright status to PractiTest status
    let status: string;
    switch (result.status) {
      case 'passed':
        status = 'PASSED';
        break;
      case 'failed':
        status = 'FAILED';
        break;
      case 'timedOut':
        status = 'BLOCKED';
        break;
      case 'skipped':
        status = 'NOT COMPLETED';
        break;
      default:
        status = 'BLOCKED';
    }

    // Format duration (milliseconds to HH:MM:SS)
    const duration = this.formatDuration(result.duration);

    // Prepare notes with error information if test failed
    let notes = `Test executed by Playwright\nBrowser: ${test.parent.project()?.name || 'unknown'}`;
    if (result.error) {
      notes += `\n\nError:\n${result.error.message || result.error}`;
    }

    // Upload to PractiTest and track the promise
    let uploadPromise: Promise<void>;

    if (instanceIdAnnotation && instanceIdAnnotation.description) {
      // Use regular create run API (runs.json) with instance ID
      const instanceId = instanceIdAnnotation.description;
      uploadPromise = this.uploadRun('runs.json', instanceId, status, duration, notes, test.title);
    } else {
      // Use auto-create run API (runs/auto_create.json)
      console.log(`[PractiTest] Test "${test.title}" - No instance ID found, using auto-create run`);
      uploadPromise = this.uploadRun('runs/auto_create.json', undefined, status, duration, notes, test.title);
    }

    this.pendingUploads.push(uploadPromise);
    await uploadPromise;
  }

  private formatDuration(milliseconds: number): string {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  private async uploadRun(
    endpoint: string,
    instanceId: string | undefined,
    status: string,
    duration: string,
    notes: string,
    testTitle: string
  ) {
    if (!this.config.email || !this.config.apiToken || !this.config.projectId) {
      console.log(`[PractiTest] Skipping upload - credentials not configured`);
      return;
    }

    const url = `${this.config.baseUrl}/api/v2/projects/${this.config.projectId}/${endpoint}`;

    // Build body with common attributes
    const attributes: any = {
      'exit-code': status === 'PASSED' ? 0 : 1,
      status: status,
      duration: duration,
      notes: notes,
    };

    let body: any;

    // Add specific attributes based on whether we have an instance ID or using auto-create
    if (instanceId) {
      // Regular run with instance ID
      attributes['instance-id'] = parseInt(instanceId);
      body = {
        data: {
          type: 'runs',
          attributes: attributes,
        },
      };
    } else {
      // Auto-create run with test name and suite ID
      if (!this.config.suiteId) {
        console.error(`[PractiTest] ✗ Cannot use auto-create for "${testTitle}" - suite_id not configured`);
        return;
      }
      attributes['set-id'] = parseInt(this.config.suiteId);
      body = {
        data: {
          type: 'runs',
          attributes: attributes,
          'test-attributes': {
            'name': testTitle,
            'author-id': 25,
            'status': 'Ready'
          },
        },
      };
    }

    // console.log(`[PractiTest] Request body:`, JSON.stringify(body, null, 2));

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'PTToken': this.config.apiToken,
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data = await response.json();
        if (instanceId) {
          console.log(`[PractiTest] ✓ Uploaded result for "${testTitle}" (Instance: ${instanceId}, Status: ${status})`);
        } else {
          console.log(`[PractiTest] ✓ Auto-created and uploaded result for "${testTitle}" (Status: ${status})`);
        }
        // console.log(`[PractiTest] Response data:`, JSON.stringify(data, null, 2));
      } else {
        const errorText = await response.text();
        console.error(`[PractiTest] ✗ Failed to upload result for "${testTitle}": ${response.status} ${response.statusText}`);
        console.error(`[PractiTest] Response: ${errorText}`);
      }
    } catch (error) {
      console.error(`[PractiTest] ✗ Error uploading result for "${testTitle}":`, error);
    }
  }

  async onEnd(result: FullResult) {
    console.log(`[PractiTest] Test run finished with status: ${result.status}`);

    // Wait for all pending uploads to complete
    if (this.pendingUploads.length > 0) {
      console.log(`[PractiTest] Waiting for ${this.pendingUploads.length} pending uploads to complete...`);
      await Promise.all(this.pendingUploads);
      console.log(`[PractiTest] All uploads completed`);
    }
  }
}

export default PractiTestReporter;
