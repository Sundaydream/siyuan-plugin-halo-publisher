import { resolve } from "node:path"
import vue from "@vitejs/plugin-vue"
import { defineConfig, loadEnv } from "vite"
import minimist from "minimist"

const pluginInfo = require("./plugin.json")

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd())
    const { VITE_SIYUAN_WORKSPACE_PATH } = env

    const args = minimist(process.argv.slice(2))
    const isWatch = args.watch || args.w || false

    let distDir = "dist"
    if (VITE_SIYUAN_WORKSPACE_PATH) {
        distDir = `${VITE_SIYUAN_WORKSPACE_PATH}/data/plugins/${pluginInfo.name}`
        // If watching, we want to output to the plugin directory directly
        if (process.env.DEV_MODE === "true" || isWatch) {
            console.log(`UI will build to: ${distDir}`)
        } else if (mode === 'production') {
            // Ideally we build to dist for zip packaging, but let's keep consistency with the main config
            // The main config logic is: isWatch ? devDistDir : "./dist"
            // But wait, the main config builds to dist in production, and devDistDir in wacth.
            // However, the user might want to install the production build locally too.
            // Let's stick to: default to dist, but if VITE_SIYUAN_WORKSPACE_PATH is explicitly set
            // AND we are in watch mode (or strict dev), we use it. 
            // Actually, the previous main config logic was: 
            // const distDir = isWatch ? devDistDir : "./dist"
            // We should match that.
            distDir = "dist"
        }
    }

    // However, simpler logic for the user test: if they run `npm run build`, they want it in `dist` to zip it,
    // OR they might want to install it.
    // Let's copy the logic from the main vite.config.ts exactly to be safe for dev mode (npm run dev).

    const siyuanWorkspacePath = VITE_SIYUAN_WORKSPACE_PATH
    let devDistDir = './dev'
    if (siyuanWorkspacePath) {
        devDistDir = `${siyuanWorkspacePath}/data/plugins/${pluginInfo.name}`
    }

    const outDir = isWatch ? devDistDir : "./dist"

    return {
        // 设置 base 为相对路径，这样构建后的资源引用会是相对路径
        base: "./",
        resolve: {
            alias: {
                "@": resolve(__dirname, "src"),
            },
        },
        plugins: [
            vue(),
        ],
        build: {
            outDir: outDir,
            emptyOutDir: false, // Don't wipe dist/dev, as it might contain the plugin.js from the other build
            rollupOptions: {
                input: {
                    ui: resolve(__dirname, "index.html"),
                },
                output: {
                    // 将资源输出到同一目录而不是 assets 子目录
                    entryFileNames: "[name].js",
                    chunkFileNames: "[name].js",
                    assetFileNames: "[name].[ext]"
                }
            },
        },
    }
})
