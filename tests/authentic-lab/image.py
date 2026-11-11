#!/usr/bin/env python3
"""Generate a deterministic synthetic two-color PNG without dependencies."""
import struct, zlib, pathlib, sys, hashlib
width, height = 400, 200
raw = b"".join(
    b"\0" + b"".join(
        (b"\x22\x66\xdd" if x < width // 2 else b"\xdd\x55\x22")
        for x in range(width)
    )
    for _ in range(height)
)
def chunk(tag, content):
    return struct.pack(">I",len(content)) + tag + content + struct.pack(">I",zlib.crc32(tag + content)&0xffffffff)
data=(b"\x89PNG\r\n\x1a\n" +
      chunk(b"IHDR",struct.pack(">IIBBBBB",width,height,8,2,0,0,0)) +
      chunk(b"IDAT",zlib.compress(raw,9)) +
      chunk(b"IEND",b""))
path=pathlib.Path(sys.argv[1]);path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data)
print("SYNTHETIC_PNG",width,height,len(data),hashlib.sha256(data).hexdigest())
