import base64
import os
import struct
import zlib

def create_png(size):
    width = height = size
    
    raw_data = b''
    bg_color = (0, 122, 204)
    fg_color = (255, 255, 255)
    
    for y in range(height):
        raw_data += b'\x00'
        for x in range(width):
            bar_height = size // 5
            margin = size // 8
            
            in_bar = False
            for i in range(3):
                bar_y = margin + i * (bar_height + margin // 2)
                bar_width = size - 2 * margin if i < 2 else size // 2
                
                if bar_y <= y < bar_y + bar_height and margin <= x < margin + bar_width:
                    in_bar = True
                    break
            
            if in_bar:
                raw_data += bytes(fg_color)
            else:
                raw_data += bytes(bg_color)
    
    def png_chunk(chunk_type, data):
        chunk_len = struct.pack('>I', len(data))
        chunk_crc = struct.pack('>I', zlib.crc32(chunk_type + data) & 0xffffffff)
        return chunk_len + chunk_type + data + chunk_crc
    
    signature = b'\x89PNG\r\n\x1a\n'
    
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    
    compressed = zlib.compress(raw_data, 9)
    
    png_data = signature
    png_data += png_chunk(b'IHDR', ihdr)
    png_data += png_chunk(b'IDAT', compressed)
    png_data += png_chunk(b'IEND', b'')
    
    return png_data

icons_dir = 'icons'
os.makedirs(icons_dir, exist_ok=True)

for size in [16, 48, 128]:
    png_data = create_png(size)
    with open(f'{icons_dir}/icon{size}.png', 'wb') as f:
        f.write(png_data)
    print(f'Created icon{size}.png')
