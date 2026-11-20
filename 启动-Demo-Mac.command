#!/bin/bash
# ============================================================
#  气脉陪练 4.0 Demo · 一键启动脚本（macOS）
#  双击本文件即可启动本地服务器并在浏览器打开
#  使用可用的 Python 3，或带 WEBrick 的 Ruby
# ============================================================
cd "$(dirname "$0")" || exit 1

PORT=8848
echo "╔════════════════════════════════════════════╗"
echo "║   气脉陪练 4.0 · 刘看山 × 易筋经   Demo        ║"
echo "║   知乎创客松 · 陪伴赛道                   ║"
echo "╚════════════════════════════════════════════╝"
echo ""
echo "正在启动本地服务器（端口 $PORT）..."

# ---------- 关键修复：端口健康检查 + 自动换端口 ----------
# 只有「返回正常首页内容」才算健康；若返回 Internal Server Error 等坏服务，
# 说明是残留的失效进程，自动改用一个空闲端口。
service_healthy() {
  local p="$1"
  local body
  body=$(curl -s --noproxy '*' --max-time 2 "http://localhost:$p/" 2>/dev/null)
  # 必须包含页面标题关键词，且不含错误关键词
  if echo "$body" | grep -q 'name="qimai-build" content="tracking-1"' && echo "$body" | grep -q 'src="motion.js"' && ! echo "$body" | grep -qi "Internal Server Error\|getcwd\|Error"; then
    return 0
  fi
  return 1
}

# 若目标端口被「健康的」本 Demo 占用，直接复用
if service_healthy "$PORT"; then
  echo "检测到已有一个正常的 Demo 服务在端口 $PORT，直接打开浏览器。"
  open "http://localhost:$PORT"
  echo "浏览器已打开。此窗口可直接关闭。"
  exit 0
fi

# 若端口有响应但是坏服务（如残留的失效进程），换一个空闲端口
if curl -s --noproxy '*' --max-time 2 -o /dev/null "http://localhost:$PORT/" 2>/dev/null; then
  echo "⚠️  端口 $PORT 有一个异常服务（可能是残留的旧进程），自动换端口..."
  for alt in 8899 8900 8910 8920; do
    if ! curl -s --noproxy '*' --max-time 2 -o /dev/null "http://localhost:$alt/" 2>/dev/null; then
      PORT=$alt
      echo "改用端口 $PORT"
      break
    fi
  done
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

start_server() {
  if command -v python3 >/dev/null 2>&1; then
    exec python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$SCRIPT_DIR"
  elif command -v ruby >/dev/null 2>&1 && ruby -rwebrick -e '' >/dev/null 2>&1; then
    exec ruby -rwebrick -e '
      server = WEBrick::HTTPServer.new(
        :Port => ARGV[0].to_i,
        :BindAddress => "127.0.0.1",
        :DocumentRoot => ARGV[1],
        :MimeTypes => WEBrick::HTTPUtils::DefaultMimeTypes.merge(
          "mjs" => "application/javascript", "wasm" => "application/wasm"
        )
      )
      trap("INT") { server.shutdown }
      trap("TERM") { server.shutdown }
      server.start
    ' "$PORT" "$SCRIPT_DIR"
  else
    echo "需要 Python 3 或带 WEBrick 的 Ruby 来启动本地服务。"
    return 1
  fi
}

LOG="$(dirname "$0")/.server.log"
start_server >"$LOG" 2>&1 &
SERVER_PID=$!

ok=0
for i in 1 2 3 4 5 6 7 8; do
  sleep 1
  if service_healthy "$PORT"; then
    ok=1; break
  fi
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then break; fi
done

if [ "$ok" -ne 1 ]; then
  echo ""
  echo "❌ 服务器启动失败。解决办法："
  echo "   • 端口 $PORT 被占用：把脚本里的 PORT 改成 8899"
  echo "   • 启动日志（.server.log）："
  cat "$LOG" 2>/dev/null
  echo ""
  read -r
  exit 1
fi

echo "✅ 服务器已就绪！浏览器会自动打开。"
echo "   若没弹出，请手动访问 http://localhost:$PORT"
echo ""
echo "摄像头需要 localhost 环境才能使用（本脚本已满足，允许权限即可）"
echo "按 Ctrl + C 可停止服务器；用完直接关掉本窗口即可。"

open "http://localhost:$PORT"

trap 'kill "$SERVER_PID" 2>/dev/null' EXIT
trap 'exit 0' INT TERM HUP
wait $SERVER_PID
