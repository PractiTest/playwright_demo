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

    if (!instanceIdAnnotation || !instanceIdAnnotation.description) {
      console.log(`[PractiTest] Test "${test.title}" - No instance ID found, skipping upload`);
      return;
    }

    const instanceId = instanceIdAnnotation.description;

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
    const uploadPromise = this.uploadRun(instanceId, status, duration, notes, test.title);
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
    instanceId: string,
    status: string,
    duration: string,
    notes: string,
    testTitle: string
  ) {
    if (!this.config.email || !this.config.apiToken || !this.config.projectId) {
      console.log(`[PractiTest] Skipping upload - credentials not configured`);
      return;
    }

    const url = `${this.config.baseUrl}/api/v2/projects/${this.config.projectId}/runs.json`;

    const body = {
      data: {
        type: 'runs',
        attributes: {
          'instance-id': parseInt(instanceId),
          'exit-code': status === 'PASSED' ? 0 : 1,
          status: status,
          duration: duration,
          notes: notes,
        },
      },
    };

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
        console.log(`[PractiTest] ✓ Uploaded result for "${testTitle}" (Instance: ${instanceId}, Status: ${status})`);
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
