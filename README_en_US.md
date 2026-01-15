# SiYuan Note Halo Publisher Plugin

[简体中文](https://github.com/Sundaydream/siyuan-plugin-halo-publisher/blob/main/README.md) | [繁體中文](https://github.com/Sundaydream/siyuan-plugin-halo-publisher/blob/main/README_zh_CHT.md)

<div align="center">
  <img src="https://cdn.jsdelivr.net/gh/Sundaydream/siyuan-plugin-halo-publisher@main/icon.png" alt="Logo" width="120" height="120">
  <h3>Bridge between SiYuan Note and Halo Blog, providing a seamless writing and publishing experience</h3>
</div>


## ⚠️ Important Notice

**This plugin is AI-assisted development, open source and free, but no guarantee is made regarding functional availability. Please backup your data before and during use, and use at your own risk. The author is not responsible for any consequences caused by this plugin!**

If you encounter any issues during use, feedback is welcome, but there is no guarantee of repair timeframes (though heard that donations and starring on GitHub can speed up bug fixes 😘).

This plugin is unlikely to support any other blog platforms besides Halo in the future. Those with such needs please choose other plugins.

---

## 📖 Introduction

**Halo Publisher** is a publishing plugin specifically designed for SiYuan Note, deeply adapted for the Halo 2.0+ blog platform. It is not just a simple publishing tool, but a complete article management solution. With this plugin, you can complete article writing, publishing, updating, and category management directly within SiYuan Note, without repeatedly switching between two platforms, allowing creation to return to its purest form.

### Key Highlights

- **Simple Interface**: Featuring a clear and crisp interface design, operation is smooth and natural.
- **Rich Parameters**: Supports settings for article content, title, metadata (Slug, Summary), etc.
- **Image Processing**:
  - **Auto Upload**: Automatically parses and uploads local images within notes to the Halo attachment library.
  - **Cloud Compatibility**: Supports Halo's GitHub OSS and other third-party storage plugins **(Some Halo plugins may cause failure to upload images to Halo local storage repository. This is not a bug of this plugin, please report to the corresponding Halo plugin)**.
  - **Smart De-duplication**: Image de-duplication mechanism to avoid repeated uploads.
- **Privacy Safe**: All requests are proxied directly through the SiYuan kernel, **zero third-party transit**, Token and configuration are stored locally only.
- **Data Freedom**: Provides full configuration and data import/export functions, facilitating cross-device migration or backup.
- **Multi-language Support**: Supports Simplified Chinese, Traditional Chinese, and English.

---

## User Guide

### 1. Installation & Configuration

#### 1.1 Install Plugin

Search and install directly in the SiYuan Note Bazaar, or:

1. Download the latest release package `package.zip`.
2. Open SiYuan Note, go to **Settings** -> **About**, check **Workspace Path**.
3. Go to the `data/plugins/` directory under the workspace directory, create a new folder `siyuan-plugin-halo-publisher`.
4. Put all files extracted from the zip archive into this folder.
5. Restart SiYuan Note and enable the plugin in the top bar.

#### 1.2 Establish Connection

![image-20260116000416251](https://cdn.jsdelivr.net/gh/Sundaydream/siyuan-plugin-halo-publisher@main/README_en_US.assets/image-20260116000416251.png)

Initial use requires configuring Halo site information:
1. Click the Halo icon in the top bar to enter the **General Settings** tab.
2. **Site URL**: Enter your Halo 2.x blog address (e.g., `https://blog.example.com`).
3. **Authorization**:
   - **Auto Mode (Recommended)**: Click "🔐 Auto Login to Get Cookie", log in to the Halo backend in the pop-up embedded window. The plugin will automatically capture authentication information.
   - **Manual Mode**:
     1. Log in to Halo backend in a browser.
     2. Press `F12` to open Developer Tools -> Network.
     3. Refresh the page, find any API request, copy the `Cookie` field from the request headers.
     4. Paste it into the plugin's "Cookie" input box.
4. Click **Save & Verify**. If "✅ Authorization Valid" is displayed, the connection is successful.

### 2. Article Publishing Flow

![image-20260116000437229](https://cdn.jsdelivr.net/gh/Sundaydream/siyuan-plugin-halo-publisher@main/README_en_US.assets/image-20260116000437229.png)

#### 2.1 Prepare Article
Complete article writing in SiYuan Note.

#### 2.2 Publishing Settings
Click the plugin icon to switch to the **Article Publish** tab, click "Fetch Current Note":
- **Title**: Automatically reads the note title, supports manual modification.
- **Slug**: The URL identifier for the article. Supports auto-generation.
- **Category & Tags**:
  - Select from existing categories/tags in Halo via dropdown.
  - Or enter and create new names.
- **Publish Settings**: Can set whether to allow comments, visibility, etc.

#### 2.3 Execute Publish
Click the **Publish to Halo** button.
- **Image Processing**: The plugin automatically scans detailed images -> Uploads to Halo -> Gets URL -> Replaces links in the text.
- **Cover Sync**: If you set a cover in SiYuan Note, it will be automatically set as the Halo article cover.

### 3. Article Management

In the **Article Management** tab, you can view all associated articles:
- **♻️ Update**: After modifying the note locally, click update to sync changes to Halo.
- **🔗 View**: Directly open the browser to visit the blog article.
- **🗑️ Delete**

### 4. Data Backup & Migration



- **Export Data**: Generate a JSON backup file containing all configurations, publish records (SiYuan ID ↔ Halo ID mapping), and image cache.
- **Import Data**: Restore a previous backup (Note: Import operation will overwrite current configuration, and site URL and Cookie will not be imported, requiring re-login).
- **Clear Data**: Completely reset the plugin, clearing all locally stored configuration and cache.

---

## 🛠️ Developer Guide

This guide is intended for advanced users who wish to secondary develop or customize the plugin.

### Technical Architecture

The project is built based on **Vue 3 + TypeScript + Vite**, using a layered architecture design to ensure code maintainability and scalability.

| Module | Path | Responsibility |
|------|------|----------|
| **UI Presentation** | `src/App.vue` | Reactive interface based on Composition API, responsible for user interaction and state display. |
| **Adaptor Layer** | `src/adaptors/` | Core adaptor layer. `HalowebWebAdaptor` encapsulates all Halo 2.0 Open API call details, decoupling business logic from underlying APIs. |
| **Core API** | `src/api/` | Basic capability layer. `BaseExtendApi` handles underlying HTTP request proxying, image upload queues, and error retry mechanisms. |
| **State Management** | `src/utils/*Store.ts` | Local persistent storage. Includes management of Publish Records (`PublishStore`) and Image Cache (`ImageCacheStore`), implementing data landing on the SiYuan side. |

### Development Environment Setup

**Prerequisites**:
- Node.js 16+
- pnpm

**Steps**:
1. Clone repository:
   ```bash
   git clone https://github.com/YourRepo/siyuan-plugin-halo-publisher.git
   ```
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Start development server:
   ```bash
   pnpm run dev
   ```
   *Note: In development mode, you need to manually link the `dist` directory to the SiYuan plugin directory.*

4. Production build:
   ```bash
   pnpm run build
   ```

### Debugging Suggestions
- **UI Debugging**: The plugin UI is essentially a WebView. You can open Developer Tools to debug Vue components by right-clicking -> "Inspect" in SiYuan Note.
- **API Debugging**: View logs with the `[HaloPublisher]` prefix in the Console panel to trace detailed request parameters and responses.

---

## 📄 License

This project is open sourced under the [MIT License](https://github.com/Sundaydream/siyuan-plugin-halo-publisher/blob/main/LICENSE). Pull Requests or Issues are welcome for contribution.
