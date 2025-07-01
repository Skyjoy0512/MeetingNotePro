#!/usr/bin/env python3
"""テスト用のシンプルな音声処理サーバー"""

import json
import logging
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse
import threading
import time

# ログ設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AudioProcessingHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        """GET リクエストの処理"""
        path = urlparse(self.path).path
        
        if path == '/health':
            self.send_health_response()
        else:
            self.send_error(404, "Not Found")
    
    def do_POST(self):
        """POST リクエストの処理"""
        path = urlparse(self.path).path
        
        # CORS ヘッダーを設定
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        
        if path == '/process-audio':
            self.handle_process_audio()
        elif path == '/test-whisper':
            self.handle_test_whisper()
        else:
            self.send_error(404, "Not Found")
    
    def do_OPTIONS(self):
        """OPTIONS リクエストの処理（CORS）"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def send_health_response(self):
        """ヘルスチェックレスポンス"""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        response = {
            "status": "healthy",
            "service": "voicenote-test-processor",
            "version": "1.0.0",
            "firebase": "demo-mode",
            "endpoints": ["/health", "/process-audio", "/test-whisper"]
        }
        
        self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
    
    def handle_process_audio(self):
        """音声処理リクエストの処理"""
        try:
            # リクエストボディを読み取り
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length > 0:
                post_data = self.rfile.read(content_length)
                request_data = json.loads(post_data.decode('utf-8'))
            else:
                request_data = {}
            
            logger.info(f"Processing audio request: {request_data}")
            
            # デモ用の音声処理結果
            result = {
                "status": "completed",
                "message": "音声処理が完了しました（テストモード）",
                "user_id": request_data.get("user_id", "test-user"),
                "audio_id": request_data.get("audio_id", "test-audio"),
                "result": {
                    "text": "これはテスト用の音声文字起こし結果です。実際のOpenAI Whisper APIを使用して正確な文字起こしを行います。",
                    "segments": [
                        {
                            "id": 0,
                            "start": 0,
                            "end": 5,
                            "text": "これはテスト用の音声文字起こし結果です。",
                            "speaker": "あなた",
                            "confidence": 0.95
                        },
                        {
                            "id": 1,
                            "start": 5,
                            "end": 10,
                            "text": "実際のOpenAI Whisper APIを使用して正確な文字起こしを行います。",
                            "speaker": "あなた",
                            "confidence": 0.92
                        }
                    ],
                    "language": "ja",
                    "duration": 10,
                    "provider": "test",
                    "model": "test-whisper"
                }
            }
            
            self.wfile.write(json.dumps(result, ensure_ascii=False).encode('utf-8'))
            
        except Exception as e:
            logger.error(f"Error processing audio: {e}")
            error_response = {
                "status": "error",
                "message": f"音声処理中にエラーが発生しました: {str(e)}"
            }
            self.wfile.write(json.dumps(error_response, ensure_ascii=False).encode('utf-8'))
    
    def handle_test_whisper(self):
        """Whisper API テストの処理"""
        try:
            # リクエストボディを読み取り
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length > 0:
                post_data = self.rfile.read(content_length)
                request_data = json.loads(post_data.decode('utf-8'))
            else:
                request_data = {}
            
            api_key = request_data.get('api_key', '')
            
            if not api_key:
                error_response = {
                    "status": "error",
                    "message": "APIキーが必要です"
                }
                self.wfile.write(json.dumps(error_response, ensure_ascii=False).encode('utf-8'))
                return
            
            # APIキー形式チェック
            if not api_key.startswith('sk-'):
                error_response = {
                    "status": "error",
                    "message": "無効なAPIキー形式です"
                }
                self.wfile.write(json.dumps(error_response, ensure_ascii=False).encode('utf-8'))
                return
            
            # テスト成功レスポンス
            result = {
                "status": "success",
                "message": "Whisper API接続テストが成功しました",
                "api_key_format": "valid",
                "test_mode": True,
                "mock_result": {
                    "text": "これはテスト音声です。",
                    "language": "ja",
                    "confidence": 0.95
                }
            }
            
            self.wfile.write(json.dumps(result, ensure_ascii=False).encode('utf-8'))
            
        except Exception as e:
            logger.error(f"Error testing Whisper API: {e}")
            error_response = {
                "status": "error",
                "message": f"テスト中にエラーが発生しました: {str(e)}"
            }
            self.wfile.write(json.dumps(error_response, ensure_ascii=False).encode('utf-8'))
    
    def log_message(self, format, *args):
        """ログメッセージのフォーマット"""
        logger.info(f"{self.address_string()} - {format % args}")

def run_server(port=8084):
    """サーバーを起動"""
    server_address = ('', port)
    httpd = HTTPServer(server_address, AudioProcessingHandler)
    
    logger.info(f"🚀 Test audio processing server starting on port {port}")
    logger.info(f"📊 Health check: http://localhost:{port}/health")
    logger.info(f"🎵 Process audio: http://localhost:{port}/process-audio")
    logger.info(f"🧪 Test Whisper: http://localhost:{port}/test-whisper")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        logger.info("👋 Server shutting down...")
        httpd.shutdown()

if __name__ == "__main__":
    import sys
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8084
    run_server(port)