const test = new svganimation.Obj(document.getElementById('test'));

test.animationa = {
    transform:
        [{
            range: [1, 5],
            local: true,
            translate: {
                x: t => 100 * Math.cos(2 * t),
                y: t => 100 * Math.sin(2 * t),
            },
            rotate: t => t,
        }],
    r: t => 2 * t,
};

const dupa = new svganimation.Create();

dupa.settings = {
    showInterface: false,
};

dupa.init(test);
