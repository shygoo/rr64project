function Viewer(queryDomContainer, config)
{
    var _this = this;

    this.cameraSpeed = config.cameraSpeed || 30;
    this.cameraNear = config.cameraNear || 1;
    this.cameraFar = config.cameraFar || 90000;
    this.fogNear = config.fogNear || 1;
    this.fogFar = config.fogFar || 5000;
    this.clearColor = config.clearColor || 0xFFFFFF;
    this.fogColor = config.fogColor || 0xFFFFFF;

    this.cameraDefaultPos = new THREE.Vector3(
        config.cameraDefaultX || 0,
        config.cameraDefaultY || 0,
        config.cameraDefaultZ || 0);

    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer({antialias: false});

    this.layers = {};

    this.hud = new Viewer.HUD(this);

    this.dom = {};
    this.dom['render'] = this.renderer.domElement;
    this.dom['render'].style.imageRendering = "pixelated";
    this.dom['render'].tabIndex = '0';

    this.dom['container'] = document.querySelector(queryDomContainer);
    this.dom['container'].appendChild(this.hud.domElement);
    this.dom['container'].appendChild(this.renderer.domElement);

    this.keysDown = {};

    this.camStepX = 0;
    this.camStepY = 0;
    this.camStepZ = 0;
    this.camRotStepX = 0;
    this.camRotStepY = 0;

    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.width, this.height);
    this.renderer.setViewport(0, 0, this.width, this.height);
    this.renderer.setScissorTest(true);
    this.renderer.setScissor(0, 0, this.width, this.height);
    this.renderer.setClearColor(this.clearColor, 1.0);
    this.renderer.alpha = true;

    this.scene.fog = new THREE.Fog(this.fogColor, this.cameraFar, this.cameraFar);

    this.camera = new THREE.PerspectiveCamera(60, this.width/this.height, this.cameraNear, this.cameraFar);
    this.camera.rotation.order = "YXZ";

    this.camera.translateX(this.cameraDefaultPos.x);
    this.camera.translateY(this.cameraDefaultPos.y);
    this.camera.translateZ(this.cameraDefaultPos.z);

    this.dom['render'].onkeydown = function(e)
    {
        if(!_this.keyEvents[e.keyCode])
        {
            return;
        }

        _this.keysDown[e.keyCode] = true;
    	e.preventDefault();
    	return false;
    }

    this.dom['render'].onkeyup = function(e)
    {
    	delete _this.keysDown[e.keyCode];
    	e.preventDefault();
    	return false;
    }

    this.dom['render'].oncontextmenu = function(e)
    {
        e.preventDefault();
        return false;
    }

    this.dom['render'].onmousedown = function(e)
    {
        this.requestPointerLock();
        this.focus();
        e.preventDefault();
        return false;
    }

    this.dom['render'].onmouseup = function(e)
    {
        document.exitPointerLock();
    }

    this.dom['render'].onmousemove = function(e)
    {
        if(e.buttons == 0)
        {
            return;
        }

        var movementX = e.movementX / 4;
        var movementY = e.movementY / 4;

        if(e.buttons == 1)
        {
            viewer.camera.translateX(-movementX * 5);
            viewer.camera.translateY(movementY * 5);
        }

        if(e.buttons == 4)
        {
            viewer.camera.translateZ(-movementX * 5);
            viewer.camera.translateZ(movementY * 5);
        }

        if(e.buttons == 2)
        {
            viewer.camera.rotateY(-movementX * 0.01);
            viewer.camera.rotateX(-movementY * 0.01);
            viewer.camera.rotation.z = 0;
        }
    }

    this.dom['render'].onwheel = function(e)
    {
        var d = -(e.deltaY / 100);
        _this.cameraSpeed += d * 5;

        if(_this.cameraSpeed < 10)
        {
            _this.cameraSpeed = 10;
        }
    }

    window.addEventListener('resize', function(e)
    {
        if(!_this.camera || !_this.renderer)
        {
            return;
        }

        _this.width = window.innerWidth;
        _this.height = window.innerHeight;
        _this.camera.aspect = (_this.width / _this.height);
        _this.camera.updateProjectionMatrix();
        _this.renderer.setSize(_this.width, _this.height);
        _this.renderer.setViewport(0, 0, _this.width, _this.height);
        _this.renderer.setScissor(0, 0, _this.width, _this.height);
    });

    this.keyEvents = {
	    //27: function(){ _this.resetCamera() }, // esc - reset camera position
	    87: function(viewer){ viewer.camStepZ = -viewer.cameraSpeed; }, // w - move forward
	    65: function(viewer){ viewer.camStepX = -viewer.cameraSpeed; }, // a - pan left
	    83: function(viewer){ viewer.camStepZ = viewer.cameraSpeed; }, // s - move backward
	    68: function(viewer){ viewer.camStepX = viewer.cameraSpeed; }, // d - pan right
	    90: function(viewer){ viewer.camStepY = -viewer.cameraSpeed; }, // z - move down
	    88: function(viewer){ viewer.camStepY = viewer.cameraSpeed; }, // x - move up
	    40: function(viewer){ viewer.camRotStepX = -20; }, // down - rotate down
	    38: function(viewer){ viewer.camRotStepX =  20; }, // up - rotate up
	    37: function(viewer){ viewer.camRotStepY =  20; }, // left - rotate left
	    39: function(viewer){ viewer.camRotStepY = -20; }  // right - rotate right
    };
}

Viewer.prototype.layer = function(name)
{
    if(typeof this.layers[name] == 'undefined')
    {
        this.layers[name] = new Viewer.Layer(this, name, label);
    }

    return this.layers[name];
}

Viewer.prototype.animate = function()
{
    this.camera.translateZ(this.camStepZ);
    this.camera.translateX(this.camStepX);
    this.camera.translateY(this.camStepY);

    this.camera.rotateX(this.camRotStepX / 1000);
    this.camera.rotateY(this.camRotStepY / 1000);
    this.camera.rotation.z = 0;

    this.camStepX *= 0.5;
    this.camStepY *= 0.5;
    this.camStepZ *= 0.5;

    for(var k in this.keysDown)
    {
        if(k in this.keyEvents) this.keyEvents[k](this);
    }

    this.renderer.render(this.scene, this.camera);
    this.framesDrawn++;

    this.hud.update();

    requestAnimationFrame(this.animate.bind(this));
}

//////////////////////////////////////////////////

Viewer.Layer = function(viewer, name, label)
{
    this.name = name;
    this.label = label;
    this.viewer = viewer;
    this.objects = [];
}

Viewer.Layer.prototype.add = function(objects)
{
    if(Array.isArray(objects))
    {
        objects.forEach(object => {
            this.objects.push(object);
            this.viewer.scene.add(object)
        });
    }
    else
    {
        this.objects.push(objects);
        this.viewer.scene.add(objects);
    }
}

Viewer.Layer.prototype.setVisible = function(bVisible)
{
    this.objects.forEach(object => {
        object.visible = bVisible;
    });
}

//////////////////////////////////////////////////

Viewer.HUD = function(viewer)
{
    this.viewer = viewer;
    this.domElement = document.createElement('div');
    this.domElement.style = "position: absolute; margin: 10px; padding: 10px; font-size: 11px; background-color: rgba(0, 0, 0, 0.2); font-family: consolas, monospace;";
    this.variables = [];
    this.elements = {};
}

Viewer.HUD.prototype.addMonitor = function(key, label, getter)
{
    var domRow = document.createElement('div');
    var domLabel = document.createElement('span');
    var domValue = document.createElement('span');
    domLabel.innerHTML = label;
    domRow.appendChild(domLabel);
    domRow.appendChild(new Text(': '));
    domRow.appendChild(domValue);
    this.domElement.appendChild(domRow);
    this.variables.push({ domValue: domValue, getter: getter });

    this.elements[key] = { domRow: domRow, domValueElement: domValue };
}

Viewer.HUD.prototype.addCheckbox = function(key, label, onchange, defaultValue)
{
    var domRow = document.createElement('div');
    var domLabel = document.createElement('label');
    var domCheckbox = document.createElement('input');
    domLabel.style = "font-family: inherit;"
    domCheckbox.style = "margin: 0px 2px 0px 0px; vertical-align: bottom;";
    domCheckbox.setAttribute('type', 'checkbox');
    domCheckbox.setAttribute('tabindex', '-1');
    domLabel.appendChild(domCheckbox);
    domLabel.appendChild(new Text(label));
    domRow.appendChild(domLabel);
    
    domCheckbox.checked = defaultValue;

    domCheckbox.addEventListener('change', (e) => {
        this.viewer.dom['render'].focus();
        onchange(e.target.checked);
    });

    this.domElement.appendChild(domRow);
    this.elements[key] = { domRow: domRow, domValueElement: domCheckbox };
}

Viewer.HUD.prototype.addSelect = function(key, label, options, onchange)
{
    var domRow = document.createElement('div');
    var domLabel = document.createElement('span');
    var domSelect = document.createElement('select');
    domSelect.setAttribute('tabindex', '-1');
    domSelect.style = "font-family: inherit; margin-left: 5px;";

    domLabel.appendChild(new Text(label));

    domRow.appendChild(domLabel);
    domRow.appendChild(domSelect);

    options.forEach(option => {
        var domOption = document.createElement('option');
        domOption.appendChild(new Text(option));
        domSelect.appendChild(domOption);
    })

    domSelect.addEventListener('change', (e) =>
    {
        var selection = { index: domSelect.selectedIndex, value: domSelect.value };
        onchange(selection);
    });

    this.domElement.appendChild(domRow);
    this.elements[key] = { domRow: domRow, domValueElement: domSelect };
}

Viewer.HUD.prototype.addSeparator = function()
{
    this.domElement.appendChild(document.createElement('hr'));
}

Viewer.HUD.prototype.setItemVisible = function(key, bVisible)
{
    this.elements[key].domRow.style.display = bVisible ? 'block' : 'none';
}

Viewer.HUD.prototype.getItemValue = function(key)
{
    var domValueElement = this.elements[key].domValueElement;

    if(domValueElement.tagName == 'INPUT')
    {
        if(domValueElement.type == 'checkbox')
        {
            return domValueElement.checked;
        }

        return domValueElement.value;
    }
    else if(domValueElement.tagName == 'SPAN')
    {
        return domValueElement.innerHTML;
    }
}

Viewer.HUD.prototype.update = function()
{
    for(var i in this.variables)
    {
        this.variables[i].domValue.innerHTML = this.variables[i].getter();
    }
}

