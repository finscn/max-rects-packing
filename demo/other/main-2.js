var PACK_RULE_LIST_2 = [
    null,
    MaxRectsBinPack.BestShortSideFit,
    MaxRectsBinPack.BestLongSideFit,
    MaxRectsBinPack.BestAreaFit,
    MaxRectsBinPack.BottomLeftRule,
    MaxRectsBinPack.ContactPointRule,
]

function comparePack(inputRects) {
    var inputCount = inputRects.length;

    var result = startComparePack(inputRects);
    var info = !result.done ?
        "Can't pack. Rects are too many or too big." : [
            // "fit:" + result.fitCount + "/" + inputCount,
            result.width + "*" + result.height,
            "RAM: " + Math.round(result.width * result.height / 1024) + "KB",
            "POT: " + Math.round(getBiggerPOT(result.width) * getBiggerPOT(result.height) / 1024) + "KB",
        ].join(" ; ");
    $id("out-info-1").innerHTML = info;

    // console.log("fit:" + result.fitCount + "/" + inputCount);
    if (!result.done) {
        result.width = 0;
        result.height = 0;
        result.rects.length = 0;
    }
    drawResult(result, "texture-1");
}

function startComparePack(rects) {

    var inputCount = rects.length;

    var packRule = Number($id("packRule").value || 0);
    // console.log("packRule: ", packRule)
    packRule = PACK_RULE_LIST_2[packRule] || MaxRectsBinPack.BestShortSideFit;

    var packer = new MaxRectsBinPack.MaxRectsBinPack(MAX_TEXTURE_WIDTH, MAX_TEXTURE_HEIGHT, false);
    console.time("-- other: MaxRectsBinPack time");
    var packedRects = packer.insert2(rects, packRule) || [];
    console.timeEnd("-- other: MaxRectsBinPack time");

    var w = 0;
    var h = 0;
    packedRects.forEach(function(r) {
        w = Math.max(w, r.x + r.width);
        h = Math.max(h, r.y + r.height);
        r.fitInfo = {
            x: r.x,
            y: r.y,
            width: r.width,
            height: r.height,
        }
    })

    var result = {
        done: packedRects.length === inputCount,
        rects: packedRects,
        fitCount: packedRects.length,
        width: w,
        height: h,
    }
    // console.log(result);
    return result;
}
