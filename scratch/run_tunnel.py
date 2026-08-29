import subprocess
import re
import sys

process = subprocess.Popen(
    ["npx", "--yes", "cloudflared", "tunnel", "--protocol", "http2", "--url", "http://127.0.0.1:5173"],
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True,
    bufsize=1
)

for line in iter(process.stdout.readline, ''):
    sys.stdout.write(line)
    sys.stdout.flush()
    match = re.search(r'(https://[a-zA-Z0-9-]+\.trycloudflare\.com)', line)
    if match:
        url = match.group(1)
        with open("/Users/aviyadav/sih 2/scratch/tunnel_url.txt", "w") as f:
            f.write(url + "\n")
        print(f"\n>>> CAPTURED LIVE CLOUDFLARE URL: {url} <<<\n", flush=True)

process.wait()
