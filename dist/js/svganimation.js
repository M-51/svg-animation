var svganimation = (function (exports) {
'use strict';

function getAttributes(object) {
    const list = new Map();
    const { attributes } = object;
    for (let i = 0; i < attributes.length; i += 1) {
        if (attributes[i].specified) {
            list.set(attributes[i].name, parseFloat(attributes[i].value) || attributes[i].value);
        }
    }
    return list;
}

function resetAttributes(object, attributes) {
    // remove all attributes
    while (object.attributes.length > 0) {
        object.removeAttribute(object.attributes[0].name);
    }
    // set new attributes
    attributes.forEach((value, key) => {
        object.setAttribute(key, value);
    });
}

function initMatrix(object, svg) {
    let matrix = null;
    const svgTransform = object.transform.baseVal;
    if (svgTransform.length) {
        svgTransform.consolidate();
        ({ matrix } = svgTransform.getItem(0));
    } else {
        matrix = svg.createSVGMatrix();
    }
    svgTransform.initialize(svg.createSVGTransformFromMatrix(matrix));
}

function decomposeMatrix(m) {
    const transform = {};
    transform.translate = {
        x: m.e,
        y: m.f,
    };
    transform.scale = Math.sign(m.a) * Math.sqrt((m.a * m.a) + (m.c * m.c));
    transform.rotate = Math.atan2(-m.c, m.a) * (180 / Math.PI);

    return transform;
}

class animatedObject {
    constructor(item) {
        this.item = item;
    }
    setVariables() {
        this.variables = getAttributes(this.item);
    }
    initMatrix(settings) {
        initMatrix(this.item, settings);
        this.matrix = this.item.transform.baseVal.getItem(0).matrix;
        this.SVGTransform = this.item.transform.baseVal.getItem(0);
    }
    resetAttributes() {
        resetAttributes(this.item, this.variables);
    }
    decomposeMatrix() {
        this.transform = decomposeMatrix(this.matrix);
    }
    setMatrix(matrix) {
        this.SVGTransform.setMatrix(matrix);
    }
    setAttribute(name, value) {
        this.item.setAttributeNS(null, name, value);
    }
}

// check if argument is undefined
function undef(item) {
    return (typeof item === 'undefined');
}

// check if expresion is a number
function isNumeric(number) {
    return !Number.isNaN(parseFloat(number)) && Number.isFinite(number);
}

// create element NS
// accepts element name as paramater
function createElNS(name) {
    return document.createElementNS('http://www.w3.org/2000/svg', name);
}

// set multiple attributtes NS
// setAttrs(element, [name, value], [name2,value2]...)
function setAttrs(element, ...attributtes) {
    attributtes.forEach((attributte) => {
        element.setAttributeNS(null, attributte[0], attributte[1]);
    });
}

function findSVGParent(element) {
    let el = element;
    while (el.tagName) {
        if (el.tagName.toLowerCase() === 'svg') {
            return el;
        }
        el = el.parentNode;
    }
    throw new Error('Cannot find SVG element! All animated elements must have SVG parent');
}

const defaultSettings = {
    showInterface: true,
    interfaceAnimation: true,
    interfaceSize: 1,
    interfaceColor: '#000',
    interfacePosition: 'auto',
    restartAtTheEnd: false,
};


function compileSettings(settings) {
    const compiledSettings = {};
    Object.keys(defaultSettings).forEach((rule) => {
        if (!undef(settings) && !undef(settings[rule])) {
            compiledSettings[rule] = settings[rule];
        } else {
            compiledSettings[rule] = defaultSettings[rule];
        }
    });
    return compiledSettings;
}

class SVGAnimation {
    constructor() {
        this.status = 'not started';
        this.timer = {
            animationId: 0,
            startTime: 0,
            time: 0,
        };
    }
    init(...objects) {
        // check if objects exist
        if (objects.length === 0) { throw new Error('No objects to animate. Add objects to "init" function'); }
        // add all animated objects to "objectList" set
        this.objectList = new Set();
        objects.forEach((object) => {
            if (Object.prototype.hasOwnProperty.call(object, 'animation')) {
                this.objectList.add(object);
            }
        });
        // check if objectList is not empty
        if (this.objectList.size === 0) { throw new Error('No objects to animate. At least one object must have "animate" property'); }
        // find svg element
        this.svg = findSVGParent(objects[0].item);
        // compile user settings
        this.settings = compileSettings(this.settings);

        // initialize all animated objects
        this.objectList.forEach((object) => {
            // remember starting attributtes
            object.setVariables();
            // initialize transformation matrix
            object.initMatrix(this.svg);
            // decompose initial matrix
            object.decomposeMatrix();
        });

        this.dispatcher();

        if (this.settings.showInterface) {
            this.interfaceControler = this.interfaceControler();
        }
    }
    reset() {
        this.objectList.forEach((object) => {
            object.resetAttributes();
            object.setVariables();
            object.initMatrix(this.svg);
            object.decomposeMatrix();
        });
        this.dispatcher();
    }
}

function createPlayer() {
    SVGAnimation.prototype.play = function play() {
        const that = this;
        function startLoop() {
            that.timer.time = Date.now() - that.timer.startTime;
            that.frame(that.timer.time / 1000);
            that.timer.animationId = window.requestAnimationFrame(startLoop);
        }
        if (this.status === 'not started') {
            this.status = 'playing';
            this.timer.startTime = Date.now();
            this.timer.animationId = window.requestAnimationFrame(startLoop);
            if (this.settings.showInterface) {
                this.interfaceControler.playPause.pause();
                this.interfaceControler.refresh.on();
            }
        } else if (this.status === 'paused') {
            this.status = 'playing';
            this.timer.startTime = Date.now() - this.timer.time;
            this.timer.animationId = window.requestAnimationFrame(startLoop);
            if (this.settings.showInterface) {
                this.interfaceControler.playPause.pause();
            }
        }
    };

    SVGAnimation.prototype.pause = function pause() {
        if (this.status === 'playing') {
            this.status = 'paused';
            window.cancelAnimationFrame(this.timer.animationId);
            if (this.settings.showInterface) {
                this.interfaceControler.playPause.play();
            }
        }
    };

    SVGAnimation.prototype.refresh = function refresh() {
        if (this.status === 'playing' || this.status === 'paused' || this.status === 'ended') {
            this.status = 'not started';
            window.cancelAnimationFrame(this.timer.animationId);
            this.timer.startTime = 0;
            this.timer.time = 0;
            if (this.settings.showInterface) {
                this.interfaceControler.playPause.on();
                this.interfaceControler.refresh.off();
            }

            // reset all animated object to starting attributtes
            this.reset();
        }
    };
    SVGAnimation.prototype.end = function end() {
        if (this.status === 'playing' || this.status === 'paused') {
            this.status = 'ended';
            const that = this;
            window.setTimeout(() => {
                window.cancelAnimationFrame(that.timer.animationId);
                if (that.settings.restartAtTheEnd) {
                    that.refresh();
                }
                if (this.settings.showInterface) {
                    this.interfaceControler.playPause.off();
                }
            }, 25);
        }
    };
}

function createDrawFunction() {
    SVGAnimation.prototype.frame = function frame(time) {
        for (let i = 0; i < this.loop.length; i += 1) {
            this.loop[i](time);
        }
    };
}

function splitArray(key, object) {
    const keyEquationObject = [];
    if (Array.isArray(object.animation[key])) {
        object.animation[key].forEach((item) => {
            keyEquationObject.push([key, item, object]);
        });
    } else {
        keyEquationObject.push([key, object.animation[key], object]);
    }
    return keyEquationObject;
}


function separate(objectsList) {
    const propertiesToAnimateList = [];
    objectsList.forEach((object) => {
        Object.keys(object.animation).forEach((key) => {
            propertiesToAnimateList.push(...splitArray(key, object));
        });
    });
    return propertiesToAnimateList;
}

function translate(matrix, x, y) {
    const modifiedMatrix = matrix;

    modifiedMatrix.e = x;
    modifiedMatrix.f = y;

    return modifiedMatrix;
}
function rotate(matrix, angle, s) {
    const modifiedMatrix = matrix;

    const c = Math.sin(angle) * s;
    const a = Math.cos(angle) * s;

    modifiedMatrix.a = a;
    modifiedMatrix.b = -c;
    modifiedMatrix.c = c;
    modifiedMatrix.d = a;

    return modifiedMatrix;
}

function scale(matrix, s, angle) {
    const modifiedMatrix = matrix;

    const c = Math.sin(angle) * s;
    const a = Math.cos(angle) * s;

    modifiedMatrix.a = a;
    modifiedMatrix.b = -c;
    modifiedMatrix.c = c;
    modifiedMatrix.d = a;

    return modifiedMatrix;
}

function translateRotate(matrix, x, y, angle, s) {
    const modifiedMatrix = matrix;

    const c = Math.sin(angle) * s;
    const a = Math.cos(angle) * s;

    modifiedMatrix.a = a;
    modifiedMatrix.b = -c;
    modifiedMatrix.c = c;
    modifiedMatrix.d = a;
    modifiedMatrix.e = x;
    modifiedMatrix.f = y;

    return modifiedMatrix;
}

function translateScale(matrix, x, y, s, angle) {
    const modifiedMatrix = matrix;

    const c = Math.sin(angle) * s;
    const a = Math.cos(angle) * s;

    modifiedMatrix.a = a;
    modifiedMatrix.b = -c;
    modifiedMatrix.c = c;
    modifiedMatrix.d = a;
    modifiedMatrix.e = x;
    modifiedMatrix.f = y;

    return modifiedMatrix;
}

function scaleRotate(matrix, s, angle) {
    const modifiedMatrix = matrix;

    const c = Math.sin(angle) * s;
    const a = Math.cos(angle) * s;

    modifiedMatrix.a = a;
    modifiedMatrix.b = -c;
    modifiedMatrix.c = c;
    modifiedMatrix.d = a;

    return modifiedMatrix;
}

function translateScaleRotate(matrix, x, y, s, angle) {
    const modifiedMatrix = matrix;
    const c = Math.sin(angle) * s;
    const a = Math.cos(angle) * s;

    modifiedMatrix.a = a;
    modifiedMatrix.b = -c;
    modifiedMatrix.c = c;
    modifiedMatrix.d = a;
    modifiedMatrix.e = x;
    modifiedMatrix.f = y;

    return modifiedMatrix;
}

function chooseTransformMethod$1(object, transform) {
    // shortcuts
    const v = object.transform; // current position/scale/rotation object
    const t = v.translate; // current translation
    const keys = Object.keys(transform);

    // check of property exist
    function check(property) {
        return keys.indexOf(property);
    }

    let animationFunc;

    if (check('translate') !== -1 && check('rotate') === -1 && check('scale') === -1) {
        // only translate
        animationFunc = (time) => {
            t.x = transform.translate.x(time);
            t.y = transform.translate.y(time);
            const matrix = translate(object.matrix, t.x, t.y);
            object.setMatrix(matrix);
        };
    } else if (check('translate') === -1 && check('rotate') !== -1 && check('scale') === -1) {
        // only rotate
        animationFunc = (time) => {
            v.rotate = transform.rotate(time);
            const matrix = rotate(object.matrix, v.rotate, v.scale);
            object.setMatrix(matrix);
        };
    } else if (check('translate') === -1 && check('rotate') === -1 && check('scale') !== -1) {
        // only scale
        animationFunc = (time) => {
            v.scale = transform.scale(time);
            const matrix = scale(object.matrix, v.scale, v.rotate);
            object.setMatrix(matrix);
        };
    } else if (check('translate') !== -1 && check('rotate') !== -1 && check('scale') === -1) {
        // translate and rotate
        animationFunc = (time) => {
            t.x = transform.translate.x(time);
            t.y = transform.translate.y(time);
            const angle = transform.rotate(time);
            const matrix = translateRotate(object.matrix, t.x, t.y, angle, v.scale);
            object.setMatrix(matrix);
        };
    } else if (check('translate') !== -1 && check('rotate') === -1 && check('scale') !== -1) {
        // translate and scale
        animationFunc = (time) => {
            t.x = transform.translate.x(time);
            t.y = transform.translate.y(time);
            v.scale = transform.scale(time);
            const matrix = translateScale(object.matrix, t.x, t.y, v.scale, v.rotate);
            object.setMatrix(matrix);
        };
    } else if (check('translate') === -1 && check('rotate') !== -1 && check('scale') !== -1) {
        animationFunc = (time) => {
            v.rotate = transform.rotate(time);
            v.scale = transform.scale(time);
            const matrix = scaleRotate(object.matrix, v.scale, v.rotate);
            object.setMatrix(matrix);
        };
    } else if (check('translate') !== -1 && check('rotate') !== -1 && check('scale') !== -1) {
        animationFunc = (time) => {
            t.x = transform.translate.x(time);
            t.y = transform.translate.y(time);
            v.rotate = transform.rotate(time);
            v.scale = transform.scale(time);
            const matrix = translateScaleRotate(object.matrix, t.x, t.y, v.scale, v.rotate);
            object.setMatrix(matrix);
        };
    }
    return animationFunc;
}

function applyAttributeAnimation$1(object, key) {
    const animationFunction = (time) => {
        const { value } = object.animation[key];
        object.setAttribute(key, value(time));
    };
    return animationFunction;
}

function applyAnimation(propertiesToAnimateList) {
    const animationList = [];
    propertiesToAnimateList.forEach((element) => {
        const [key, animation, object] = element;
        if (key === 'transform') {
            animationList.push([chooseTransformMethod$1(object, animation), animation]);
        } else {
            animationList.push([applyAttributeAnimation$1(object, key), animation]);
        }
    });
    return animationList;
}

function infiniteEndpoint(animationFunction, animation) {
    let rangeFunction;
    if (animation.local) {
        rangeFunction = (t) => {
            if (t >= animation.range[0]) {
                animationFunction(t - animation.range[0]);
            }
        };
    } else {
        rangeFunction = (t) => {
            if (t >= animation.range[0]) {
                animationFunction(t);
            }
        };
    }
    return rangeFunction;
}

function interval(animationFunction, animation, deleteItemFromLoop) {
    let rangeFunction;
    if (animation.local) {
        rangeFunction = (t) => {
            if (t >= animation.range[0] && t <= animation.range[1]) {
                animationFunction(t - animation.range[0]);
            } else if (t > animation.range[1]) {
                deleteItemFromLoop(rangeFunction);
            }
        };
    } else {
        rangeFunction = (t) => {
            if (t >= animation.range[0] && t <= animation.range[1]) {
                animationFunction(t);
            } else if (t > animation.range[1]) {
                deleteItemFromLoop(rangeFunction);
            }
        };
    }
    return rangeFunction;
}

function oneTime(animationFunction, animation, deleteItemFromLoop) {
    let rangeFunction;
    if (animation.local) {
        rangeFunction = (t) => {
            if (t >= animation.range) {
                animationFunction(t - animation.range);
                deleteItemFromLoop(rangeFunction);
            }
        };
    } else {
        rangeFunction = (t) => {
            if (t >= animation.range) {
                animationFunction(t);
                deleteItemFromLoop(rangeFunction);
            }
        };
    }

    return rangeFunction;
}

function chooseRangeType(animationFunction, animation, deleteItemFromLoop) {
    let rangeFunction;
    const { range } = animation;
    if (Array.isArray(range)) {
        if (range.length === 1) {
            rangeFunction = infiniteEndpoint(animationFunction, animation);
        } else if (range.length === 2) {
            rangeFunction = interval(animationFunction, animation, deleteItemFromLoop);
        }
    } else if (isNumeric(range)) {
        rangeFunction = oneTime(animationFunction, animation, deleteItemFromLoop);
    }
    return rangeFunction;
}

function applyRange(animationList, deleteItemFromLoop) {
    const loop = [];
    animationList.forEach((element) => {
        const [animationFunction, animation] = element;
        if (animation.range) {
            loop.push(chooseRangeType(animationFunction, animation, deleteItemFromLoop));
        } else {
            loop.push(animationFunction);
        }
    });
    return loop;
}

function createMainObjectDispatcher() {
    SVGAnimation.prototype.dispatcher = function dispatcher() {
        // array of [key, animation, objecy] items
        const propertiesToAnimateList = separate(this.objectList);
        // array of [animationFunction, animation (equation. range etc...)]
        const animationList = applyAnimation(propertiesToAnimateList);
        // array of animationFunction with range applied
        const deleteItemFromLoop = this.deleteItemFromLoop.bind(this);
        this.loop = applyRange(animationList, deleteItemFromLoop);
    };
}

function createMainObjectHelpers() {
    SVGAnimation.prototype.deleteItemFromLoop = function deleteItemFromLoop(item) {
        this.loop.splice(this.loop.indexOf(item), 1);
        if (this.loop < 1) {
            this.end();
        }
    };
}

function createPlayPause(s, svg) {
    const group = createElNS('g');
    const playPause1 = createElNS('polygon');
    const playPause2 = createElNS('polygon');

    setAttrs(playPause1, ['points', '-10,-10 -10,10 0,-5 0,5']);
    setAttrs(playPause2, ['points', '-10,-10 -10,10 10,0 10,0']);


    group.appendChild(playPause1);
    group.appendChild(playPause2);

    // button
    const button = createElNS('rect');
    setAttrs(button, ['x', '-10'], ['y', '-10'], ['width', '20'], ['height', '20'], ['fill-opacity', '0']);

    // group button and icon

    const playPauseGroup = createElNS('g');
    playPauseGroup.appendChild(group);
    playPauseGroup.appendChild(button);

    // set button and icons to correct position at the bottom left of svg
    function setPosition() {
        const viewBox = svg.viewBox.baseVal;
        const matrix = svg.createSVGMatrix();
        matrix.e = viewBox.x + 25;
        matrix.f = viewBox.y + (viewBox.height - 25);
        playPauseGroup.transform.baseVal.initialize(svg.createSVGTransformFromMatrix(matrix));
    }

    function addUserSettings() {
        // set color
        setAttrs(group, ['fill', s.interfaceColor]);

        // set interface size
        const { matrix } = playPauseGroup.transform.baseVal.getItem(0);
        matrix.a = s.interfaceSize;
        matrix.d = s.interfaceSize;

        // set interface position
        if (s.interfacePosition !== 'auto') {
            [matrix.e, matrix.f] = s.interfacePosition;
        }

        playPauseGroup.transform.baseVal.getItem(0).setMatrix(matrix);
    }
    setPosition();
    addUserSettings();
    svg.appendChild(playPauseGroup);

    function switchToPause() {
        setAttrs(playPause1, ['points', '-9,-10 -9,10 -2,10 -2,-10']);
        setAttrs(playPause2, ['points', '2,-10 2,10 9,10 9,-10']);
    }
    function switchToPlay() {
        setAttrs(playPause1, ['points', '-10,-10 -10,10 0,-5 0,5']);
        setAttrs(playPause2, ['points', '-10,-10 -10,10 10,0 10,0']);
    }
    function switchPlayPauseOff() {
        setAttrs(group, ['display', 'none']);
    }
    function switchPlayPauseOn() {
        setAttrs(playPause1, ['points', '-10,-10 -10,10 0,-5 0,5']);
        setAttrs(playPause2, ['points', '-10,-10 -10,10 10,0 10,0']);
        setAttrs(group, ['display', 'block']);
    }

    return {
        play: switchToPlay,
        pause: switchToPause,
        off: switchPlayPauseOff,
        on: switchPlayPauseOn,
        button,
    };
}

function createRefresh(s, svg) {
    // arrows
    const marker = createElNS('marker');
    marker.id = 'arrow';
    setAttrs(marker, ['viewBox', '0 0 10 10'], ['refX', '1'], ['refY', '5'], ['markerWidth', '3'], ['markerHeight', '3'], ['orient', 'auto']);


    // arrow path
    const path = createElNS('path');
    setAttrs(path, ['d', 'M 0 0 L 10 5 L 0 10 z']);
    marker.appendChild(path);


    // icons
    const refresh = createElNS('g');
    const arc1 = createElNS('path');
    const arc2 = createElNS('path');
    setAttrs(arc1, ['d', 'M-10 0 A 10 10 0 0 1 0 -10'], ['marker-end', 'url(#arrow)']);
    setAttrs(arc2, ['d', 'M10 0 A 10 10 0 0 1 0 10'], ['marker-end', 'url(#arrow)']);
    refresh.appendChild(arc1);
    refresh.appendChild(arc2);
    setAttrs(refresh, ['fill', 'none'], ['stroke-width', '2'], ['transform', 'translate(30, 0)']);


    // button
    const button = createElNS('rect');
    setAttrs(button, ['x', '-10'], ['y', '-10'], ['width', '20'], ['height', '20'], ['fill-opacity', '0'], ['transform', 'translate(30, 0)']);

    // group button and icon

    const refreshGroup = createElNS('g');
    refreshGroup.appendChild(refresh);
    refreshGroup.appendChild(button);

    // set button and icons to correct position at the bottom left of svg
    function setPosition() {
        const viewBox = svg.viewBox.baseVal;
        const matrix = svg.createSVGMatrix();
        matrix.e = viewBox.x + 25;
        matrix.f = viewBox.y + (viewBox.height - 25);
        refreshGroup.transform.baseVal.initialize(svg.createSVGTransformFromMatrix(matrix));
    }

    function addUserSettings() {
    // set color
        setAttrs(refresh, ['stroke', s.interfaceColor]);
        setAttrs(marker, ['fill', s.interfaceColor]);

        // set interface size
        const { matrix } = refreshGroup.transform.baseVal.getItem(0);
        matrix.a = s.interfaceSize;
        matrix.d = s.interfaceSize;

        // set interface position
        if (s.interfacePosition !== 'auto') {
            [matrix.e, matrix.f] = s.interfacePosition;
        }

        refreshGroup.transform.baseVal.getItem(0).setMatrix(matrix);
    }
    let defs = svg.getElementsByTagName('defs')[0];

    // check for defs element in DOM, if not exist - add it
    if (!defs) {
        defs = createElNS('defs');
        svg.insertBefore(defs, svg.firstChild);
    }

    setPosition();

    addUserSettings();

    // add button to DOM
    defs.appendChild(marker);
    svg.appendChild(refreshGroup);

    function switchRefreshOff() {
        setAttrs(refresh, ['display', 'none']);
    }

    function switchRefreshOn() {
        setAttrs(refresh, ['display', 'block']);
    }

    return {
        off: switchRefreshOff,
        on: switchRefreshOn,
        button,
    };
}

function createInterfaceControler() {
    SVGAnimation.prototype.interfaceControler = function interfaceControler() {
        const playPause = createPlayPause(this.settings, this.svg);
        const refresh = createRefresh(this.settings, this.svg);
        refresh.off();

        const that = this;

        function controlPlayPause() {
            if (that.status === 'not started' || that.status === 'paused') {
                that.play();
            } else if (that.status === 'playing') {
                that.pause();
            }
        }

        function controlRefresh() {
            if (that.status === 'playing' || that.status === 'paused' || that.status === 'ended') {
                that.refresh();
            }
        }
        playPause.button.addEventListener('click', controlPlayPause, false);
        refresh.button.addEventListener('click', controlRefresh, false);

        return {
            playPause,
            refresh,
        };
    };
}

createPlayer();
createDrawFunction();
createMainObjectDispatcher();
createMainObjectHelpers();
createInterfaceControler();

exports.Obj = animatedObject;
exports.Create = SVGAnimation;

return exports;

}({}));
//# sourceMappingURL=svganimation.js.map
