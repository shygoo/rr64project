Number.prototype.hex = function(len)
{
    len = len || 8;
    var s = this.toString(16).toUpperCase();
    while(s.length < len) s = "0" + s;
    return s;
}

function dvalloc(numBytes)
{
    return new DataView(new ArrayBuffer(numBytes));
}

function dvpart(dv, offset, size)
{
    return new DataView(dv.buffer, dv.byteOffset + offset);
}

function dvgetstr(dv, offset)
{
    var s = "";
    for(var i = 0;; i++)
    {
        var c = dv.getUint8(offset + i);
        if(c == 0)
        {
            break;
        }
        s += String.fromCharCode(c);
    }
    return s;
}

function attachFileReader(query, onloadend, onloading)
{
    var domFileInput = document.querySelector(query);
    var reader = new FileReader();
    reader.onloadend = function()
    {
        onloadend(reader.result);
    }

    domFileInput.addEventListener('change', function()
    {
        onloading();
        reader.readAsArrayBuffer(domFileInput.files[0]);
    });
}

function attachDropZone(query, onloadend, onloading)
{
    var domDropZone = document.querySelector(query);
    
    function isTargetFileInput(e)
    {
        return (e.target.tagName == 'INPUT' && e.target.getAttribute('type') == 'file');
    }

    function ondragevent(e)
    {
        if(isTargetFileInput(e))
        {
            return;
        }
        
        e.preventDefault();
    }

    domDropZone.addEventListener('dragenter', ondragevent);
    domDropZone.addEventListener('dragover', ondragevent);

    domDropZone.addEventListener('drop', function(e)
    {
        if(isTargetFileInput(e))
        {
            return;
        }

        e.preventDefault();

        if(e.dataTransfer.files)
        {
            var file = e.dataTransfer.files[0];
            var reader = new FileReader();

            reader.onloadend = function()
            {
                onloadend(reader.result);
            }

            try {
                reader.readAsArrayBuffer(file);
                onloading();
            }
            catch(e) {
            }
        }
    });
}

function saveAs(filename, data)
{
    var blob = new Blob([data], {type: 'octet/stream'});
    var url = window.URL.createObjectURL(blob);

    if(navigator && navigator.msSaveBlob)
    {
        navigator.msSaveBlob(blob, filename);
    }
    else
    {
        var a = document.createElement('a');
        a.style = "display: none;";
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        try
        {
            a.click();
        }
        catch(e)
        {
            console.error(e);
        }
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }
}
