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
