var svganimation = (function (exports) {
'use strict';

// check if argument is undefined
function undef(item) {
    return (typeof item === 'undefined');
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

const defaultSettings = {
    svg: document.querySelector('svg'),
    showInterface: true,
    interfaceAnimation: true,
    interfaceSize: 1,
    interfaceColor: '#000',
    interfacePosition: 'auto',
};
const compiledSettings = {};

function compileSettings() {
    Object.keys(defaultSettings).forEach((rule) => {
        if (!undef(svganimation.settings) && !undef(svganimation.settings[rule])) {
            compiledSettings[rule] = svganimation.settings[rule];
        } else {
            compiledSettings[rule] = defaultSettings[rule];
        }
    });
}

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
button.id = 'refresh';
setAttrs(button, ['x', '-10'], ['y', '-10'], ['width', '20'], ['height', '20'], ['fill-opacity', '0'], ['transform', 'translate(30, 0)']);

// group button and icon

const refreshGroup = createElNS('g');
refreshGroup.appendChild(refresh);
refreshGroup.appendChild(button);

// set button and icons to correct position at the bottom left of svg
function setPosition() {
    const viewBox = compiledSettings.svg.viewBox.baseVal;
    const matrix = compiledSettings.svg.createSVGMatrix();
    matrix.e = viewBox.x + 25;
    matrix.f = viewBox.y + (viewBox.height - 25);
    refreshGroup.transform.baseVal.initialize(compiledSettings.svg.createSVGTransformFromMatrix(matrix));
}

function addUserSettings() {
    // set color
    setAttrs(refresh, ['stroke', compiledSettings.interfaceColor]);
    setAttrs(marker, ['fill', compiledSettings.interfaceColor]);

    // set interface size
    const { matrix } = refreshGroup.transform.baseVal.getItem(0);
    matrix.a = compiledSettings.interfaceSize;
    matrix.d = compiledSettings.interfaceSize;

    // set interface position
    if (compiledSettings.interfacePosition !== 'auto') {
        [matrix.e, matrix.f] = compiledSettings.interfacePosition;
    }

    refreshGroup.transform.baseVal.getItem(0).setMatrix(matrix);
}

function switchRefreshOff() {
    setAttrs(refresh, ['display', 'none']);
}

function switchRefreshOn() {
    setAttrs(refresh, ['display', 'block']);
}

function addButtonToDOM() {
    let defs = compiledSettings.svg.getElementsByTagName('defs')[0];

    // check for defs element in DOM, if not exist - add it
    if (!defs) {
        defs = createElNS('defs');
        compiledSettings.svg.insertBefore(defs, compiledSettings.svg.firstChild);
    }

    setPosition();

    addUserSettings();

    // add button to DOM
    defs.appendChild(marker);
    compiledSettings.svg.appendChild(refreshGroup);
}

const group = createElNS('g');
const playPause1 = createElNS('polygon');
const playPause2 = createElNS('polygon');

setAttrs(playPause1, ['points', '-10,-10 -10,10 0,-5 0,5']);
setAttrs(playPause2, ['points', '-10,-10 -10,10 10,0 10,0']);


group.appendChild(playPause1);
group.appendChild(playPause2);

// button
const button$1 = createElNS('rect');
button$1.id = 'playPause';
setAttrs(button$1, ['x', '-10'], ['y', '-10'], ['width', '20'], ['height', '20'], ['fill-opacity', '0']);

// group button and icon

const playPauseGroup = createElNS('g');
playPauseGroup.appendChild(group);
playPauseGroup.appendChild(button$1);

// set button and icons to correct position at the bottom left of svg
function setPosition$1() {
    const viewBox = compiledSettings.svg.viewBox.baseVal;
    const matrix = compiledSettings.svg.createSVGMatrix();
    matrix.e = viewBox.x + 25;
    matrix.f = viewBox.y + (viewBox.height - 25);
    playPauseGroup.transform.baseVal.initialize(compiledSettings.svg.createSVGTransformFromMatrix(matrix));
}

function addUserSettings$1() {
    // set color
    setAttrs(group, ['fill', compiledSettings.interfaceColor]);

    // set interface size
    const { matrix } = playPauseGroup.transform.baseVal.getItem(0);
    matrix.a = compiledSettings.interfaceSize;
    matrix.d = compiledSettings.interfaceSize;

    // set interface position
    if (compiledSettings.interfacePosition !== 'auto') {
        [matrix.e, matrix.f] = compiledSettings.interfacePosition;
    }

    playPauseGroup.transform.baseVal.getItem(0).setMatrix(matrix);
}

function switchToPause() {
    setAttrs(playPause1, ['points', '-9,-10 -9,10 -2,10 -2,-10']);
    setAttrs(playPause2, ['points', '2,-10 2,10 9,10 9,-10']);
}
function switchToPlay() {
    setAttrs(playPause1, ['points', '-10,-10 -10,10 0,-5 0,5']);
    setAttrs(playPause2, ['points', '-10,-10 -10,10 10,0 10,0']);
}

function addButtonToDOM$1() {
    setPosition$1();
    addUserSettings$1();
    compiledSettings.svg.appendChild(playPauseGroup);
}

function start$1() {
    addButtonToDOM();
    addButtonToDOM$1();
}

let status = 'not started';

function playStop() {
    if (status === 'not started') {
        status = 'playing';
        switchRefreshOn();
        switchToPause();
    } else if (status === 'playing') {
        status = 'paused';
        switchToPlay();
    } else if (status === 'paused') {
        status = 'playing';
        switchToPause();
    }
}

function refresh$1() {
    if (status === 'playing' || status === 'paused' || status === 'ended') {
        switchRefreshOff();
    }
}
function start$2() {
    button$1.addEventListener('click', playStop, false);
    switchRefreshOff();
    button.addEventListener('click', refresh$1, false);
}

class addObject {
    constructor(name) {
        this.name = name;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    compileSettings();
    start$1();
    start$2();
});

exports.addObject = addObject;

return exports;

}({}));
//# sourceMappingURL=svganimation.js.map
