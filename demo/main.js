var RECT_COLOR = "#CCCCCC";
var RECT_BORDER_COLOR = "#FF0000";
var MIN_RECT_SIDE = 10;
var MAX_RECT_SIDE = 150;

var RECT_COUNT = 50 * 2;

var MAX_TEXTURE_WIDTH = 2048;
var MAX_TEXTURE_HEIGHT = 1024;


var PACK_RULE_LIST = [
    null,
    MaxRectsPacking.ShortSideFit,
    MaxRectsPacking.LongSideFit,
    MaxRectsPacking.AreaFit,
    MaxRectsPacking.BottomLeft,
    MaxRectsPacking.ContactPoint,
]
var SORT_RULE_LIST = [
    null,
    false,
    MaxRectsPacking.SORT.widthDESC,
    MaxRectsPacking.SORT.heightDESC,
    MaxRectsPacking.SORT.shortSideDESC,
    MaxRectsPacking.SORT.longSideDESC,
    MaxRectsPacking.SORT.areaDESC,
    MaxRectsPacking.SORT.manhattanDESC,
    MaxRectsPacking.SORT.widthASC,
    MaxRectsPacking.SORT.heightASC,
    MaxRectsPacking.SORT.shortSideASC,
    MaxRectsPacking.SORT.longSideASC,
    MaxRectsPacking.SORT.areaASC,
    MaxRectsPacking.SORT.manhattanASC
]

window.inputRects;

function repack(reset) {
    console.log("=======================");

    window.inputRects = (!window.inputRects || reset) ? createTestRects() : window.inputRects;

    var list0 = JSON.parse(JSON.stringify(window.inputRects));
    var result = startPack(list0);
    var info = !result.done ?
        "Can't pack. Rects are too many or too big." : [
            // "fit:" + result.fitCount + "/" + result.inputCount,
            result.width + "*" + result.height,
            "RAM: " + Math.round(result.width * result.height / 1024) + "KB",
            "POT: " + Math.round(getBiggerPOT(result.width) * getBiggerPOT(result.height) / 1024) + "KB",
        ].join(" ; ");

    $id("out-info-0").innerHTML = info;
    drawResult(result, "texture-0");

    var canvas = $id("texture-0");
    var ctx = canvas.getContext("2d");
    packer.freeRectangles.forEach(function(r, index) {
        drawRect(ctx, r, null, "#0000EE")
    });


    var list1 = JSON.parse(JSON.stringify(window.inputRects));
    comparePack(list1);
}

function createPacker() {
    var allowRotate = $id("allowRotate").checked || false;
    var findBestRect = JSON.parse($id("findBestRect").value);
    var pot = $id("pot").checked || false;
    var square = $id("square").checked || false;
    var padding = Number($id("padding").value || 0);

    // alert(findBestRect)
    // console.log("allowRotate: ", allowRotate)
    // console.log("pot: ", pot)
    // console.log("square: ", square)
    // console.log("padding: ", padding)

    var packer = new MaxRectsPacking.Packer(MAX_TEXTURE_WIDTH, MAX_TEXTURE_HEIGHT, {
        allowRotate: allowRotate,
        findBestRect: findBestRect,
        pot: pot,
        square: square,
        padding: padding,
    });
    return packer;
}

var packer;

function startPack(rects) {

    var packRule = Number($id("packRule").value || 0);
    packRule = PACK_RULE_LIST[packRule];

    var sortRule = Number($id("sortRule").value || 0);
    sortRule = SORT_RULE_LIST[sortRule]

    packer = createPacker();

    console.time("MaxRectsPacking time");
    var result = packer.fit(rects, packRule, sortRule);
    console.timeEnd("MaxRectsPacking time");

    console.log(result);

    return result;
}

var packerOne;

function startPackOne(rect) {

    packerOne = createPacker();

    return testPackOne(rect);
}

function testPackOne(rect) {

    var packRule = Number($id("packRule").value || 0);
    // console.log("packRule: ", packRule)
    packRule = PACK_RULE_LIST[packRule];

    rect = rect || createRandomRect();

    var packer = packerOne || createPacker();

    console.time("MaxRectsPacking-One time");
    var result = packer.fitOne(rect, packRule);
    console.timeEnd("MaxRectsPacking-One time");

    console.log(result);
    return result;
}

function drawResult(result, targetCanvas, color, borderColor) {
    var canvas = $id(targetCanvas);
    canvas.width = result.width;
    canvas.height = result.height;
    var h = 500 * result.height / MAX_TEXTURE_HEIGHT;
    var w = h * result.width / result.height;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";

    var ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (result.rects) {
        result.rects.forEach(function(r, index) {
            r.fitInfo.index = index;
            drawRect(ctx, r.fitInfo, color, borderColor)
        });
    }

}

function createRandomRect() {
    var width = randomInt(MIN_RECT_SIDE, MAX_RECT_SIDE);
    var height = randomInt(MIN_RECT_SIDE, MAX_RECT_SIDE);
    return {
        width: width,
        height: height
    }
}

function createTestRects(count) {
    count = count || RECT_COUNT;
    var rects = [];
    var step = MAX_RECT_SIDE - MIN_RECT_SIDE;

    for (var i = 0; i < count; i++) {
        // var w = randomFloat(MIN_RECT_SIDE / 10, MAX_RECT_SIDE / 10) * 10
        var w = step * (randomInt(1, 9) / 10)
        w += MIN_RECT_SIDE + randomInt(-5, 5);

        var h = step * (randomInt(1, 9) / 10)
        h += MIN_RECT_SIDE + randomInt(-5, 5);

        // var h = w * (1.0 + randomInt(-8, 8) / 10)

        // console.log(w,h)
        if (randomFloat(0, 1) < 1) {
            w = w + h;
            h = w - h;
            w = w - h;
        }
        rects.push({
            width: w >> 0,
            height: h >> 0,
        })
    }

    return rects;
}
