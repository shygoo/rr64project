function rgba32_texture_from_ci8(dv, ciOffset, tlutOffset, width, height)
{
    var numTexels = width * height;
    var data = new Uint8Array(numTexels * 4);

    for(var i = 0; i < numTexels; i++)
    {
        var ci = dv.getUint8(ciOffset + i);
        var texel = dv.getUint16(tlutOffset + ci*2);
        const factor = 0xFF / 0x1F;
        data[i*4+0] = (((texel >> 11) & 0x1F) * factor) | 0;
        data[i*4+1] = (((texel >>  6) & 0x1F) * factor) | 0;
        data[i*4+2] = (((texel >>  1) & 0x1F) * factor) | 0;
        data[i*4+3] = (texel & 1) * 255;
    }

    return data;
}

function rgba32_texture_from_ci4(dv, ciOffset, tlutOffset, width, height)
{
    var numTexels = width * height;
    var data = new Uint8Array(numTexels * 4);

    for(var i = 0; i < numTexels/2; i++)
    {
        var byte = dv.getUint8(ciOffset + i);
        var ci0 = (byte & 0xF0) >> 4;
        var ci1 = (byte & 0x0F);
        var texel0 = dv.getUint16(tlutOffset + ci0*2);
        var texel1 = dv.getUint16(tlutOffset + ci1*2);
        const factor = 0xFF / 0x1F;
        data[i*8+0] = (((texel0 >> 11) & 0x1F) * factor) | 0;
        data[i*8+1] = (((texel0 >>  6) & 0x1F) * factor) | 0;
        data[i*8+2] = (((texel0 >>  1) & 0x1F) * factor) | 0;
        data[i*8+3] = (texel0 & 1) * 255;
        data[i*8+4] = (((texel1 >> 11) & 0x1F) * factor) | 0;
        data[i*8+5] = (((texel1 >>  6) & 0x1F) * factor) | 0;
        data[i*8+6] = (((texel1 >>  1) & 0x1F) * factor) | 0;
        data[i*8+7] = (texel1 & 1) * 255;
    }

    return data;
}

function rgba32_texture_from_i8(dv, offset, width, height)
{
    var numTexels = width * height;
    var data = new Uint8Array(numTexels * 4);

    for(var i = 0; i < numTexels; i++)
    {
        var byte = dv.getUint8(offset + i);
        data[i*4+0] = byte;
        data[i*4+1] = byte;
        data[i*4+2] = byte;
        data[i*4+3] = byte;
    }

    return data;
}

function rgba32_texture_from_i4(dv, offset, width, height)
{
    var numTexels = width * height;
    var data = new Uint8Array(numTexels * 4);

    for(var i = 0; i < numTexels/2; i++)
    {
        var byte = dv.getUint8(offset + i);
        var t0 = 0x11 * ((byte & 0xF0) >> 4);
        var t1 = 0x11 * (byte & 0x0F);
        data[i*8+0] = t0;
        data[i*8+1] = t0;
        data[i*8+2] = t0;
        data[i*8+3] = t0;
        data[i*8+4] = t1;
        data[i*8+5] = t1;
        data[i*8+6] = t1;
        data[i*8+7] = t1;
    }

    return data;
}

// print texture to the console
function print_rgba32_texture(texture, width, height)
{
    var array = new Uint8ClampedArray(texture.buffer);
    var imageData = new ImageData(array, width, height);

    var ctx = document.createElement('canvas').getContext('2d');
    ctx.canvas.width = width;
    ctx.canvas.height = height;
    ctx.putImageData(imageData, 0, 0, 0, 0, width, height);

    var url = ctx.canvas.toDataURL()
    console.log('%c ', 'border: 1px solid #000; font-size: 0px; background-image: url("'+url+'"); padding: ' + (width/2) + 'px ' + (height/2) + 'px;');
}