import { translate } from './matrix-transformations';

function chooseTransformMethod(object) {
    const { transform } = object.animation;
    const keys = Object.keys(transform);

    function check(property) {
        return keys.indexOf(property);
    }

    let animationFunc;

    if (check('translate') !== -1 && check('rotate') === -1 && check('scale') === -1) {
        // only translate
        animationFunc = (time) => {
            const x = transform.translate.x(time);
            const y = transform.translate.y(time);
            const matrix = translate(object.matrix, x, y);
            object.setMatrix(matrix);
        };
    } else if (check('translate') === -1 && check('rotate') !== -1 && check('scale') === -1) {
        // only rotate
        console.log('rotate');
    } else if (check('translate') === -1 && check('rotate') === -1 && check('scale') !== -1) {
        // only scale
        console.log('scale');
    } else if (check('translate') !== -1 && check('rotate') !== -1 && check('scale') === -1) {
        // translate and rotate
        console.log('translate and rotate');
    } else if (check('translate') !== -1 && check('rotate') === -1 && check('scale') !== -1) {
        // translate and scale
        console.log('translate and scale');
    } else if (check('translate') === -1 && check('rotate') !== -1 && check('scale') !== -1) {
        // rotate and scale
        console.log('rotate and scale');
    } else if (check('translate') !== -1 && check('rotate') !== -1 && check('scale') !== -1) {
        // translate, rotate and scale
        console.log('translate, rotate and scale');
    }

    return animationFunc;
}

export default chooseTransformMethod;
