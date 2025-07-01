/**
 * VoiceNote Playwright Browser Test
 * ブラウザでのアプリケーション操作とデバッグ
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class VoiceNoteBrowserTester {
    constructor() {
        this.browser = null;
        this.context = null;
        this.page = null;
        this.baseUrl = 'https://voicenote-dev.web.app';
        this.screenshotDir = './test-screenshots';
        
        // スクリーンショット保存ディレクトリ作成
        if (!fs.existsSync(this.screenshotDir)) {
            fs.mkdirSync(this.screenshotDir, { recursive: true });
        }
    }

    async init() {
        console.log('🚀 VoiceNote ブラウザテスト開始');
        
        // ブラウザ起動
        this.browser = await chromium.launch({ 
            headless: false,  // GUIでブラウザを表示
            slowMo: 500      // 操作を遅くして見やすく
        });
        
        // コンテキスト作成（日本語設定）
        this.context = await this.browser.newContext({
            locale: 'ja-JP',
            timezone: 'Asia/Tokyo'
        });
        
        // ページ作成
        this.page = await this.context.newPage();
        
        // コンソールログを監視
        this.page.on('console', msg => {
            console.log(`📝 Console [${msg.type()}]: ${msg.text()}`);
        });
        
        // エラーログを監視
        this.page.on('pageerror', error => {
            console.error(`❌ Page Error: ${error.message}`);
        });
        
        console.log('✅ ブラウザ初期化完了');
    }

    async takeScreenshot(name, description = '') {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${timestamp}-${name}.png`;
        const filepath = path.join(this.screenshotDir, filename);
        
        await this.page.screenshot({ 
            path: filepath,
            fullPage: true 
        });
        
        console.log(`📸 スクリーンショット保存: ${filename} ${description ? '- ' + description : ''}`);
        return filepath;
    }

    async testBasicPageLoad() {
        console.log('\n🔍 Test 1: 基本ページ読み込みテスト');
        
        try {
            // ホームページへ移動
            console.log('ホームページに移動中...');
            await this.page.goto(this.baseUrl, { waitUntil: 'networkidle' });
            
            // 基本情報取得
            const title = await this.page.title();
            const url = this.page.url();
            
            console.log(`📋 ページタイトル: ${title}`);
            console.log(`🌐 URL: ${url}`);
            
            // スクリーンショット取得
            await this.takeScreenshot('homepage-loaded', 'ホームページ読み込み完了');
            
            // 要素の存在確認
            const hasNavigation = await this.page.locator('nav').count() > 0;
            const hasMainContent = await this.page.locator('main').count() > 0;
            
            console.log(`🧭 ナビゲーション要素: ${hasNavigation ? '✅ 存在' : '❌ 不在'}`);
            console.log(`📄 メインコンテンツ: ${hasMainContent ? '✅ 存在' : '❌ 不在'}`);
            
            return { success: true, title, url };
            
        } catch (error) {
            console.error(`❌ ホームページ読み込み失敗: ${error.message}`);
            await this.takeScreenshot('homepage-error', 'ホームページエラー');
            return { success: false, error: error.message };
        }
    }

    async testResponsiveDesign() {
        console.log('\n📱 Test 2: レスポンシブデザインテスト');
        
        const devices = [
            { name: 'iPhone SE', width: 375, height: 667 },
            { name: 'iPhone 11', width: 414, height: 896 },
            { name: 'iPad', width: 768, height: 1024 },
            { name: 'Desktop', width: 1920, height: 1080 }
        ];
        
        const results = [];
        
        for (const device of devices) {
            try {
                console.log(`📏 ${device.name} (${device.width}x${device.height}) テスト中...`);
                
                // ビューポートサイズ変更
                await this.page.setViewportSize({ 
                    width: device.width, 
                    height: device.height 
                });
                
                // 少し待機
                await this.page.waitForTimeout(1000);
                
                // スクリーンショット取得
                await this.takeScreenshot(
                    `responsive-${device.name.toLowerCase().replace(' ', '-')}`,
                    `${device.name}での表示`
                );
                
                // レイアウト要素の確認
                const isVisible = await this.page.locator('body').isVisible();
                const hasOverflow = await this.page.evaluate(() => {
                    return document.body.scrollWidth > window.innerWidth;
                });
                
                results.push({
                    device: device.name,
                    visible: isVisible,
                    hasHorizontalScroll: hasOverflow,
                    success: true
                });
                
                console.log(`  ✅ ${device.name}: 表示OK${hasOverflow ? ' (横スクロールあり)' : ''}`);
                
            } catch (error) {
                console.error(`  ❌ ${device.name}: ${error.message}`);
                results.push({
                    device: device.name,
                    success: false,
                    error: error.message
                });
            }
        }
        
        return results;
    }

    async testNavigation() {
        console.log('\n🧭 Test 3: ナビゲーションテスト');
        
        const navigationTests = [
            { path: '/record', name: '録音ページ' },
            { path: '/settings/api', name: 'API設定ページ' },
            { path: '/help', name: 'ヘルプページ' },
            { path: '/profile', name: 'プロフィールページ' }
        ];
        
        const results = [];
        
        // デスクトップサイズに戻す
        await this.page.setViewportSize({ width: 1920, height: 1080 });
        
        for (const test of navigationTests) {
            try {
                console.log(`🔗 ${test.name}への移動テスト...`);
                
                // ページに移動
                const url = `${this.baseUrl}${test.path}`;
                await this.page.goto(url, { waitUntil: 'networkidle' });
                
                // 現在のURL確認
                const currentUrl = this.page.url();
                const title = await this.page.title();
                
                // スクリーンショット取得
                await this.takeScreenshot(
                    `page-${test.path.replace(/[\/]/g, '-')}`,
                    test.name
                );
                
                // ページ固有の要素確認
                const hasContent = await this.page.locator('main, [role="main"]').count() > 0;
                const hasError = await this.page.locator('text=404').count() > 0;
                
                results.push({
                    name: test.name,
                    path: test.path,
                    url: currentUrl,
                    title,
                    hasContent,
                    hasError,
                    success: !hasError && hasContent
                });
                
                console.log(`  ✅ ${test.name}: ${hasError ? '❌ 404エラー' : hasContent ? '✅ 正常表示' : '⚠️ コンテンツ不明'}`);
                
            } catch (error) {
                console.error(`  ❌ ${test.name}: ${error.message}`);
                results.push({
                    name: test.name,
                    path: test.path,
                    success: false,
                    error: error.message
                });
            }
        }
        
        return results;
    }

    async testInteractiveElements() {
        console.log('\n🖱️ Test 4: インタラクティブ要素テスト');
        
        try {
            // ホームページに戻る
            await this.page.goto(this.baseUrl, { waitUntil: 'networkidle' });
            
            // ボタン要素を探す
            const buttons = await this.page.locator('button').count();
            const links = await this.page.locator('a').count();
            const inputs = await this.page.locator('input').count();
            
            console.log(`🔲 ボタン要素: ${buttons}個`);
            console.log(`🔗 リンク要素: ${links}個`);
            console.log(`📝 入力要素: ${inputs}個`);
            
            // 最初のボタンがあればクリックテスト
            if (buttons > 0) {
                try {
                    const firstButton = this.page.locator('button').first();
                    const buttonText = await firstButton.textContent();
                    
                    console.log(`🖱️ 最初のボタンクリックテスト: "${buttonText}"`);
                    
                    // クリック前のスクリーンショット
                    await this.takeScreenshot('before-button-click', 'ボタンクリック前');
                    
                    // ボタンクリック
                    await firstButton.click();
                    
                    // 少し待機
                    await this.page.waitForTimeout(2000);
                    
                    // クリック後のスクリーンショット
                    await this.takeScreenshot('after-button-click', 'ボタンクリック後');
                    
                    console.log('  ✅ ボタンクリック成功');
                    
                } catch (clickError) {
                    console.error(`  ❌ ボタンクリック失敗: ${clickError.message}`);
                }
            }
            
            return {
                success: true,
                buttons,
                links,
                inputs
            };
            
        } catch (error) {
            console.error(`❌ インタラクティブ要素テスト失敗: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async testConsoleErrors() {
        console.log('\n🐛 Test 5: コンソールエラー監視');
        
        const errors = [];
        const warnings = [];
        
        // エラー・警告監視
        this.page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            } else if (msg.type() === 'warning') {
                warnings.push(msg.text());
            }
        });
        
        // 各ページを再訪問してエラーチェック
        const pages = ['/', '/record', '/settings/api'];
        
        for (const pagePath of pages) {
            try {
                console.log(`🔍 ${pagePath} のエラーチェック...`);
                await this.page.goto(`${this.baseUrl}${pagePath}`, { waitUntil: 'networkidle' });
                await this.page.waitForTimeout(3000); // エラーが発生するまで待機
            } catch (error) {
                console.error(`ページ ${pagePath} でエラー: ${error.message}`);
            }
        }
        
        console.log(`🔴 コンソールエラー: ${errors.length}件`);
        console.log(`🟡 コンソール警告: ${warnings.length}件`);
        
        if (errors.length > 0) {
            console.log('❌ エラー詳細:');
            errors.forEach((error, index) => {
                console.log(`  ${index + 1}. ${error}`);
            });
        }
        
        return {
            errors,
            warnings,
            success: errors.length === 0
        };
    }

    async generateReport(results) {
        console.log('\n📊 テスト結果レポート生成');
        
        const timestamp = new Date().toISOString();
        const report = {
            timestamp,
            summary: {
                total_tests: Object.keys(results).length,
                passed: Object.values(results).filter(r => r && r.success !== false).length,
                failed: Object.values(results).filter(r => r && r.success === false).length
            },
            results,
            screenshots_dir: this.screenshotDir
        };
        
        const reportPath = path.join(this.screenshotDir, 'test-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        console.log(`📋 テストレポート保存: ${reportPath}`);
        console.log(`📸 スクリーンショット保存先: ${this.screenshotDir}`);
        
        return report;
    }

    async cleanup() {
        console.log('\n🧹 クリーンアップ');
        
        if (this.page) {
            await this.page.close();
        }
        
        if (this.context) {
            await this.context.close();
        }
        
        if (this.browser) {
            await this.browser.close();
        }
        
        console.log('✅ ブラウザテスト完了');
    }
}

// メイン実行関数
async function runTests() {
    const tester = new VoiceNoteBrowserTester();
    
    try {
        // 初期化
        await tester.init();
        
        // テスト実行
        const results = {};
        
        results.basicPageLoad = await tester.testBasicPageLoad();
        results.responsiveDesign = await tester.testResponsiveDesign();
        results.navigation = await tester.testNavigation();
        results.interactiveElements = await tester.testInteractiveElements();
        results.consoleErrors = await tester.testConsoleErrors();
        
        // レポート生成
        const report = await tester.generateReport(results);
        
        // 結果サマリー表示
        console.log('\n🎯 テスト結果サマリー');
        console.log(`✅ 成功: ${report.summary.passed}件`);
        console.log(`❌ 失敗: ${report.summary.failed}件`);
        console.log(`📊 総テスト数: ${report.summary.total_tests}件`);
        
    } catch (error) {
        console.error(`❌ テスト実行エラー: ${error.message}`);
    } finally {
        // クリーンアップ
        await tester.cleanup();
    }
}

// スクリプトが直接実行された場合
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = VoiceNoteBrowserTester;