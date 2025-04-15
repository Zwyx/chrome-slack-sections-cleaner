# Slack Sections Cleaner

This browser extension automatically removes old conversations from your Slack channel sections.

<div align="center">

**Before**

![Before, a section contains three channels of which one has not been used for six months](/res/before.png)

**After**

![After, the unused channel has been removed from the section](/res/after.png)

</div>

Notes that it only works in the browser (not in Slack's desktop app). However, using the browser app as a desktop app is easy: simply open your browser's menu and click "Install app" or "Create shortcut". Personally, I have never installed Slack's desktop app.

This extension uses Slacks internal APIs, which can potentially change at any time.

## Installation

### Chrome

- download `chrome-slack-sections-cleaner-x.x.x.zip` and extract its content,
- open `chrome://extensions`,
- activate `Developer mode`,
- click `Load unpacked` and open the folder containing the content of the zip file.

### Firefox

- use the Developer or Nightly edition of Firefox,
- download `chrome-slack-sections-cleaner-x.x.x.xpi`,
- open `about:config` and set `xpinstall.signatures.required` to `false`,
- open `about:addons`,
- click the cog wheel, `Install Add-on From File...`, and select the `xpi` file,
- (optional) reopen `about:config` and set `xpinstall.signatures.required` back to `true`.

## Configuration

Click the extension's icon and enter:

- one or more workspace names,
- one or more section names,
- the number of days for a channel to be considered unused.

<div align="center">

![Configuration dialog](/res/config.png)

</div>

Then close and reopen Slack.

The cleaning task is performed one minute after startup (unless it's been performed less than 24 hours ago), then every 24 hours.

To confirm that things are working, open the developer tools and look for the logs starting with `[Slack Sections Cleaner]`.
