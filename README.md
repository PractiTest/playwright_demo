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
     "projectId": "your-project-id"
   }
   ```
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

To enable automatic result reporting to PractiTest, add an `instanceId` annotation to your tests:

```typescript
test('test name', {
  annotation: { type: 'instanceId', description: '1877220' }
}, async ({ page }) => {
  // Your test code here
});
```

The `instanceId` corresponds to the test instance ID in PractiTest where results should be uploaded.

## Project Structure

- `tests/` - Test files
- `practitest-reporter.ts` - Custom reporter for PractiTest integration
- `playwright.config.ts` - Playwright configuration
- `practitest.config.example.json` - Example configuration file

## How It Works

When tests complete, the custom PractiTest reporter:
1. Reads test results and annotations
2. Maps Playwright test statuses to PractiTest statuses
3. Uploads results to PractiTest API with test duration and notes
4. Logs success/failure of each upload
