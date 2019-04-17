var RECT_COLOR = "#CCCCCC";
var RECT_BORDER_COLOR = "#FF0000";
var MIN_RECT_SIDE = 100;
var MAX_RECT_SIDE = 600;

var RECT_COUNT = 100;

var MAX_TEXTURE_WIDTH = 2048;
var MAX_TEXTURE_HEIGHT = 2048;


var RULE_LIST = [
    null,
    MaxRectsPacking.ShortSideFit,
    MaxRectsPacking.LongSideFit,
    MaxRectsPacking.AreaFit,
    MaxRectsPacking.BottomLeft,
    MaxRectsPacking.ContactPoint,
]

var SORT_RULE_LIST = [
    null,
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

function repack() {
    window.inputRects = window.inputRects || createTestRects();

    var result = startPack(window.inputRects);
    var info = [
        "fit:" + result.fitCount + "/" + window.inputRects.length,
        result.width + "*" + result.height,
        "RAM : " + Math.round(result.width * result.height / 1024) + "KB",
    ]
    $id("out-info-0").innerHTML = info.join(" ; ")
    drawResult(result, "texture-0")
}

function startPack(rects) {
    var rule = Number($id("rule").value || 0);
    var allowRotate = $id("allowRotate").checked || false;
    var pot = $id("pot").checked || false;
    var square = $id("square").checked || false;
    var padding = Number($id("padding").value || 0);


    console.log("allowRotate: ", allowRotate)
    console.log("pot: ", pot)
    console.log("square: ", square)
    console.log("padding: ", padding)
    console.log("rule: ", rule)

    rule = RULE_LIST[rule];

    var pack = new MaxRectsPacking.Packer(MAX_TEXTURE_WIDTH, MAX_TEXTURE_HEIGHT, {
        allowRotate: allowRotate,
        pot: pot,
        square: square,
        padding: padding,
    });

    console.time(" Pack time");
    var result = pack.fit(rects, rule);
    console.timeEnd(" Pack time");

    console.log(result)
    return result;
}

function drawResult(result, targetCanvas) {
    var canvas = $id(targetCanvas);
    canvas.width = result.width;
    canvas.height = result.height;
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (result.rects) {
        result.rects.forEach(function(r, index) {
            r.fitInfo.index = index;
            drawRect(ctx, r.fitInfo)
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
    var step = (MAX_RECT_SIDE - MIN_RECT_SIDE) / (count / 5);

    for (var i = 0; i < count; i++) {
        // var w = randomFloat(MIN_RECT_SIDE / 10, MAX_RECT_SIDE / 10) * 10
        var w = step * (1.0 + randomFloat(-5, 15) / 10)
        var h = w * (0.2 + randomInt(0, 16) / 10)
        rects.push({
            width: w >> 0,
            height: h >> 0,
        })
    }

    return rects;
}
