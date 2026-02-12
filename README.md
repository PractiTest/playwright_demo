# Playwright Demo with PractiTest Integration

This project demonstrates Playwright end-to-end testing with automatic test result reporting to PractiTest API.

## Prerequisites

- macOS (for other platforms, adjust package manager commands accordingly)
- A PractiTest account with API access

## Installation

### 1. Open Terminal

1. Press `Command + Space` to open Spotlight Search
2. Type "Terminal" and press Enter
3. A terminal window will open - this is where you'll run all the commands below

### 2. Install Homebrew

If you don't have Homebrew installed yet, run this command in Terminal:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Follow the on-screen instructions. After installation completes, you may need to add Homebrew to your PATH (the installer will tell you if needed).

### 3. Install Node.js and npm

```bash
brew install node
```

### 4. Download the Project

1. On the GitHub repository page, click the green **"Code"** button
2. Select **"Download ZIP"**
3. The ZIP file will download to your Downloads folder
4. Double-click the ZIP file to extract it
5. The extracted folder will be named something like `playwright_maps-main`

### 5. Navigate to the Project Directory

In Terminal, navigate to the downloaded project folder:

```bash
cd ~/Downloads/playwright_maps-main
```

*Note: If your folder has a different name, adjust the command accordingly.*

### 6. Install Dependencies

```bash
npm install
```

This will install Playwright and all required dependencies.

## Configuration

### PractiTest API Configuration

**Option 1: JSON Configuration File (Recommended)**

1. Copy the example configuration file:
   ```bash
   cp practitest.config.example.json practitest.config.json
   ```

2. Edit `practitest.config.json` with your actual credentials:
   ```json
   {
     "baseUrl": "https://api.practitest.com",
     "email": "your-email@example.com",
     "apiToken": "your-api-token-here",
     "projectId": "your-project-id",
     "suite_id": "your-suite-id"
   }
   ```
**Note:** `suite_id` is required only if you don't specify the instance-id in the tests.
**Note:** The `practitest.config.json` file is gitignored to protect your credentials.

## Running Tests

Run all tests:
```bash
npx playwright test
```

Run tests in headed mode (with visible browser):
```bash
npx playwright test --headed
```


## Test Annotations

The reporter supports two ways to report test results to PractiTest:

### Option 1: With Instance ID (Regular Run)

Add an `instanceId` annotation to report to an existing test instance:

```typescript
test('google maps directions from LA to SF', {
  annotation: { type: 'instanceId', description: '1877220' }
}, async ({ page }) => {
  // Your test code here
});
```

The reporter uses the [Create a Run API](https://www.practitest.com/api-v2/#create-a-run) endpoint (`runs.json`).

### Option 2: Without Instance ID (Auto-Create Run)

Tests without an `instanceId` annotation will use auto-create:

```typescript
test('google maps directions from NYC to Atlanta', async ({ page }) => {
  // Your test code here
});
```

The reporter uses the [Auto-Create a Run API](https://www.practitest.com/api-v2/#auto-create-a-run) endpoint (`runs/auto_create.json`), which automatically finds or creates the test and instance. **Requires `suite_id` in configuration.**

## Project Structure

- `tests/` - Test files
- `practitest-reporter.ts` - Custom reporter for PractiTest integration
- `playwright.config.ts` - Playwright configuration
- `practitest.config.example.json` - Example configuration file

## How It Works

When tests complete, the custom PractiTest reporter:
1. Reads test results and annotations
2. Maps Playwright test statuses to PractiTest statuses:
   - `passed` → `PASSED`
   - `failed` → `FAILED`
   - `timedOut` → `BLOCKED`
   - `skipped` → `NOT COMPLETED`
3. Uploads results to PractiTest API:
   - **With instanceId**: Uses `runs.json` endpoint with the specified instance id
   - **Without instanceId**: Uses `runs/auto_create.json` endpoint to automatically create test and instance if required (uses test name)
4. Logs success/failure of each upload