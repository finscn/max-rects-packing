"use strict";

var MaxRectsPacking = MaxRectsPacking || {};

(function(exports) {
    /**
     * @constructor
     * @param {Number} maxWidth - The max width of container
     * @param {Number} maxHeight - The max height of container
     * @param {Object} options - options of packing:
     *        findBestRect: try to find the best rect for free-boxes (null to try all)
     *        allowRotate:  allow rotate the rects
     *        pot:  use power of 2 sizing
     *        padding:  the border padidng of each rectangle
     *        square:  use square size
     *        freeSpaceWidth: the width of original free space
     *        freeSpaceHeight: the height of original free space
     */

    var Packer = function(maxWidth, maxHeight, options) {
        Object.assign(this, {
            allowRotate: false,
            findBestRect: false,
            pot: false,
            square: false,
            padding: 0,
            freeSpaceWidth: 0,
            freeSpaceHeight: 0,
        });

        this.usedRectangles = [];
        this.freeRectangles = [];

        this.init(maxWidth, maxHeight, options);
    }

    Packer.prototype.init = function(maxWidth, maxHeight, options) {
        this.maxWidth = maxWidth;
        this.maxHeight = maxHeight;

        Object.assign(this, options);

        this.reset();
    }

    Packer.prototype.reset = function(maxWidth, maxHeight, options) {
        this.usedRectangles.length = 0;
        this.freeRectangles.length = 0;
        this.right = 0;
        this.bottom = 0;
    }

    /*
     * @param {Array} rectangles - An array of input rectangles.
     *        The each rectangle is like this:  { width: 123, height: 456 }
     *
     * @param {String} packRule - The rule for packing
     *          ShortSideFit, LongSideFit, AreaFit, BottomLeft, ContactPoint
     *        If not pass (or pass null), will try all rules and find out the best one.
     *
     * @param {Function} sortRule - The rule for sorting the input rectangles
     *          SORT.widthDESC, SORT.heightDESC, SORT.shortSideDESC, SORT.longSideDESC, SORT.areaDESC, SORT.manhattanDESC,
     *          SORT.widthASC, SORT.heightASC, SORT.shortSideASC, SORT.longSideASC, SORT.areaASC, SORT.manhattanASC
     *        The default value is SORT.longSideDESC, you can pass your custom sort function.
     *        If pass `false`, will not do sort.
     *        If not pass (or pass null), will try all rules and find out the best one.
     *
     * ( _finding - An internal argument, don't set it. )
     *
     * @return {Object} - The result.
     */
    Packer.prototype.fit = function(rectangles, packRule, sortRule, _finding) {
        if (!packRule || (!sortRule && sortRule !== false)) {
            var bestRule = this.findBestRule(rectangles, packRule, sortRule);
            if (!bestRule) {
                return {
                    done: false,
                    fitCount: 0,
                };
            }
            packRule = bestRule.packRule;
            sortRule = bestRule.sortRule;
            this.findBestRect = bestRule.findBestRect;
        }

        var result = {
            done: false,
            fitCount: 0,
            rects: null,
            findBestRect: this.findBestRect,
            packRule: packRule,
            sortRule: sortRule ? sortRule.ruleName : (sortRule === false ? "false" : null),
            width: 0,
            height: 0,
            realWidth: 0,
            realHeight: 0,
        };

        var inputCount = rectangles.length;

        var padding = this.padding || 0;
        var padding2 = padding * 2;

        if (padding) {
            for (var i = 0; i < inputCount; i++) {
                var rect = rectangles[i];
                rect.width += padding2;
                rect.height += padding2;
            }
        }

        if (_finding) {
            this._rectanglesInfo = this._rectanglesInfo || this.computeRectanglesInfo(rectangles);
        } else {
            this._rectanglesInfo = this.computeRectanglesInfo(rectangles);
        }

        (PrepareRule[packRule] || PrepareRule['default'])(rectangles, sortRule, this);

        var outputRects = this.findFreeBoxForRects(rectangles, packRule);

        result.rects = outputRects;
        var fitCount = outputRects.length;

        result.inputCount = inputCount;
        result.fitCount = fitCount;
        result.unfitCount = inputCount - fitCount;
        result.done = result.unfitCount === 0;

        // debugger
        if (padding) {
            for (var i = 0; i < inputCount; i++) {
                var rect = rectangles[i];
                rect.width -= padding2;
                rect.height -= padding2;
            }
        }

        var realWidth = this.right;
        var realHeight = this.bottom;

        result.realWidth = realWidth;
        result.realHeight = realHeight;
        result.realArea = realWidth * realHeight;

        result.binWidth = Math.pow(2, Math.ceil(Math.log(realWidth) * Math.LOG2E));
        result.binHeight = Math.pow(2, Math.ceil(Math.log(realHeight) * Math.LOG2E));
        result.binArea = result.binWidth * result.binHeight;

        if (this.pot) {
            result.width = result.binWidth;
            result.height = result.binHeight;
        } else {
            result.width = realWidth;
            result.height = realHeight;
        }

        if (this.square) {
            // Do or NOT Do ?
            // result.width = Math.max(result.width, result.height);
            // result.height = Math.max(result.width, result.height);
        }

        result.area = result.width * result.height;

        return result;
    }

    /*
     * @param {Object} rect - the input rectangle for fitting.
     *        It is like this:  { width: 123, height: 456 }
     *
     * @param {String} packRule - The rule for packing
     *          ShortSideFit, LongSideFit, AreaFit, BottomLeft, ContactPoint
     *        Default is ShortSideFit.
     */
    Packer.prototype.fitOne = function(rect, packRule) {

        packRule = packRule || exports.ShortSideFit;

        if (this.freeRectangles.length === 0) {

            this.right = this.freeSpaceWidth || rect.width || this.maxWidth;
            this.bottom = this.freeSpaceHeight || rect.height || this.maxHeight;

            this.right = Math.min(this.maxWidth, this.right);
            this.bottom = Math.min(this.maxHeight, this.bottom);

            this.freeRectangles.push(new Rect(0, 0, this.right, this.bottom));
        }

        var padding = this.padding || 0;
        var padding2 = padding * 2;

        rect.width += padding2;
        rect.height += padding2;

        var outputRects = this.findFreeBoxForRects([rect], packRule);

        rect.width -= padding2;
        rect.height -= padding2;

        return outputRects[0];
    }

    Packer.prototype.findFreeBoxForRects = function(rectangles, packRule) {
        var outputRects = [];
        var processedFlag = {};

        // TODO: chose the best expand-direction by _expandIndex ?
        this._expandIndex = 0;

        for (var i = 0; i < rectangles.length; i++) {
            if (processedFlag[i]) {
                continue;
            }
            var rect = rectangles[i];
            var w0 = rect.width;
            var h0 = rect.height;
            rect.fitInfo = null;

            var fitRect = this.findBestFreeBox(w0, h0, packRule);
            if (!fitRect) {
                if (this.allowRotate && w0 !== h0) {
                    fitRect = this.findBestFreeBox(h0, w0, packRule);
                }
                if (!fitRect) {
                    if (this.findBestRect) {
                        var rect2 = null;
                        var j = i + 1;
                        for (; j < rectangles.length; j++) {
                            if (processedFlag[j]) {
                                continue;
                            }
                            rect2 = rectangles[j];
                            if (rect2.width > w0 && rect2.height > h0) {
                                break;
                            }
                            fitRect = this.findBestFreeBox(rect2.width, rect2.height, packRule);
                            if (!fitRect && this.allowRotate && rect2.width !== rect2.height) {
                                fitRect = this.findBestFreeBox(rect2.height, rect2.width, packRule);
                            }
                            if (fitRect) {
                                break;
                            }
                        }
                        if (fitRect) {
                            this.createFitInfo(rect2, fitRect);
                            outputRects.push(rect2);
                            processedFlag[j] = true;
                            i--;
                            continue;
                        }
                    }

                    if (this.expandFreeSpace(w0, h0, packRule)) {
                        i--;
                        continue;
                    }
                    break;
                }
            }

            this.createFitInfo(rect, fitRect);
            outputRects.push(rect);
            processedFlag[i] = true;
        }

        return outputRects;
    }

    Packer.prototype.createFitInfo = function(rect, fitRect) {
        var fitInfo = {
            x: fitRect.x,
            y: fitRect.y,
            width: fitRect.width,
            height: fitRect.height,
        };

        if (rect.width !== fitRect.width || rect.height !== fitRect.height) {
            fitInfo.rotated = true;
        }

        rect.fitInfo = fitInfo;

        var padding = this.padding || 0;
        fitInfo.x += padding;
        fitInfo.y += padding;
        fitInfo.width -= padding * 2;
        fitInfo.height -= padding * 2;

        this._placeRectangle(fitRect);
    }

    Packer.prototype.findBestFreeBox = function(width, height, packRule) {
        var bestFreeBox = null;

        this.freeRectangles.sort(FreeBoxSortRule[packRule](width, height, this));

        for (var j = 0; j < this.freeRectangles.length; j++) {
            var freeBox = this.freeRectangles[j];
            if (freeBox.width >= width && freeBox.height >= height) {
                bestFreeBox = freeBox.clone();
                bestFreeBox.width = width;
                bestFreeBox.height = height;
                break;
            }
        }

        return bestFreeBox;
    }

    //////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////


    // Packer.prototype.findRectForFreeBoxes = function(rectangles, packRule) {
    //     var outputRects = [];

    //     while (rectangles.length > 0) {

    //         var fitRect;

    //         // TODO

    //         this._placeRectangle(fitRect);

    //         var fitInfo = {
    //             x: fitRect.x,
    //             y: fitRect.y,
    //             width: fitRect.width,
    //             height: fitRect.height,
    //         };

    //         if (rect.width !== fitRect.width || rect.height !== fitRect.height) {
    //             fitInfo.rotated = true;
    //         }

    //         rect.fitInfo = fitInfo;

    //         outputRects.push(rect);

    //     }

    //     return outputRects;
    // }

    //////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////


    Packer.prototype.findBestRule = function(rectangles, packRule, sortRule) {
        var findBestRectList;
        var findBestRect = this.findBestRect;
        if (findBestRect !== false && findBestRect !== true) {
            findBestRectList = [false, true];
        } else {
            findBestRectList = [findBestRect];
        }

        var packRuleList;
        if (packRule) {
            packRuleList = [
                packRule
            ]
        } else {
            packRuleList = [
                exports.ShortSideFit,
                exports.LongSideFit,
                exports.AreaFit,
                exports.BottomLeft,
                exports.ContactPoint,
            ]
        }

        var sortRuleList;
        if (sortRule || sortRule === false) {
            sortRuleList = [sortRule]
        } else {
            sortRuleList = [
                false,
                SORT.widthDESC, SORT.heightDESC, SORT.shortSideDESC, SORT.longSideDESC, SORT.areaDESC, SORT.manhattanDESC,
                SORT.widthASC, SORT.heightASC, SORT.shortSideASC, SORT.longSideASC, SORT.areaASC, SORT.manhattanASC
            ]
        }

        var resultList = [];

        findBestRectList.forEach((_findBestRect, _findBestRectIndex) => {
            sortRuleList.forEach((_sortRule, _sortIndex) => {
                packRuleList.forEach((_packRule, _packIndex) => {
                    this.reset();
                    this.findBestRect = _findBestRect;
                    var _rectangles = rectangles.slice(0);
                    var result = this.fit(_rectangles, _packRule, _sortRule, true);
                    if (result.done) {
                        result._packRuleIndex = _packIndex;
                        result._sortRuleIndex = _sortIndex;
                        result._findBestRectIndex = _findBestRectIndex;
                        resultList.push(result);
                        // console.log(result.packRule, result.realWidth, result.realHeight);
                    }
                });
            });
        })


        this.findBestRect = findBestRect;
        this.reset();

        // resultList.sort((a, b) => {
        //     let d = 0;
        //     d = d || a.binArea - b.binArea;
        //     d = d || a.realArea - b.realArea;
        //     d = d || a.area - b.area;
        //     return d;
        // });

        resultList.sort((a, b) => {
            let d = 0;
            d = d || a.area - b.area;
            d = d || a.binArea - b.binArea;
            d = d || a.realArea - b.realArea;
            return d;
        });

        var bestRsult = resultList[0];

        if (!bestRsult) {
            return null;
        }

        var packRule = packRuleList[bestRsult._packRuleIndex]
        var sortRule = sortRuleList[bestRsult._sortRuleIndex];
        var findBestRect = findBestRectList[bestRsult._findBestRectIndex];

        return {
            packRule: packRule,
            sortRule: sortRule,
            findBestRect: findBestRect,
        };
    }

    Packer.prototype._placeRectangle = function(rect) {
        for (var i = 0; i < this.freeRectangles.length; i++) {
            if (this._splitFreeBox(this.freeRectangles[i], rect)) {
                this.freeRectangles.splice(i, 1);
                i--;
            }
        }

        this._pruneFreeList();
        this.usedRectangles.push(rect);
    }

    Packer.prototype._splitFreeBox = function(freeBox, rect) {
        var freeRectangles = this.freeRectangles;
        // Test with SAT if the Rectangles even intersect.

        var outOfHoriz = rect.x >= freeBox.x + freeBox.width || rect.x + rect.width <= freeBox.x;
        var outOfVert = rect.y >= freeBox.y + freeBox.height || rect.y + rect.height <= freeBox.y;

        if (outOfHoriz || outOfVert) {
            return false;
        }

        var newBox;

        // New box at the left side of the used box.
        if (rect.x > freeBox.x) {
            newBox = freeBox.clone();
            newBox.width = rect.x - newBox.x;
            freeRectangles.push(newBox);
        }

        // New box at the top side of the used box.
        if (rect.y > freeBox.y) {
            newBox = freeBox.clone();
            newBox.height = rect.y - newBox.y;
            freeRectangles.push(newBox);
        }



        // New box at the right side of the used box.
        var right = rect.x + rect.width;
        var freeRight = freeBox.x + freeBox.width;
        if (right < freeRight || right < this.maxWidth && right === freeRight && right === this.right) {
            newBox = freeBox.clone();
            newBox.x = right;
            newBox.width = freeRight - newBox.x;
            freeRectangles.push(newBox);
        }

        // New box at the bottom side of the used box.
        var bottom = rect.y + rect.height;
        var freeBottom = freeBox.y + freeBox.height;
        if (bottom < freeBottom || bottom < this.maxHeight && bottom === freeBottom && bottom === this.bottom) {
            newBox = freeBox.clone();
            newBox.y = bottom;
            newBox.height = freeBottom - newBox.y;
            freeRectangles.push(newBox);
        }


        return true;
    }

    Packer.prototype._pruneFreeList = function() {
        var freeRectangles = this.freeRectangles;
        for (var i = 0; i < freeRectangles.length; i++) {
            var box0 = freeRectangles[i];
            // if (box0.width === 0 && box0.x < this.right ||
            //     box0.height === 0 && box0.y < this.bottom) {
            //     console.log("size=0", box0.width, box0.height);
            //     freeRectangles.splice(i, 1);
            //     i--;
            //     continue;
            // }
            for (var j = i + 1; j < freeRectangles.length; j++) {
                if (Rect.isContainedIn(box0, freeRectangles[j])) {
                    freeRectangles.splice(i, 1);
                    i--;
                    break;
                }
                if (Rect.isContainedIn(freeRectangles[j], box0)) {
                    freeRectangles.splice(j, 1);
                    j--;
                }
            }
        }
    }

    Packer.prototype.getExpandInfo = function(width, height, packRule) {
        var expandX = width;
        var expandY = height;

        var rightList = [];
        var bottomList = [];

        var addNewBox = false;

        if (this.freeRectangles.length === 0) {
            addNewBox = true;
        } else {
            this.freeRectangles.forEach(rect => {
                if (rect.x + rect.width === this.right) {
                    rightList.push(rect);
                }
                var bottom = rect.y + rect.height;
                if (bottom === this.bottom) {
                    bottomList.push(rect);
                }
            });
            rightList.sort(function(a, b) {
                return a.width - b.width
            })
            bottomList.sort(function(a, b) {
                return a.height - b.height
            })

            var freeBoxRight = rightList.find(function(freeBox) {
                return freeBox.height >= height;
            });
            var freeBoxBottom = bottomList.find(function(freeBox) {
                return freeBox.width >= width;
            });

            if (freeBoxRight) {
                expandX = width - freeBoxRight.width;
            }
            if (freeBoxBottom) {
                expandY = height - freeBoxBottom.height;
            }
        }

        if (this.square) {
            expandX = Math.min(expandX || expandY, expandY || expandX);
            expandY = expandX;
        }

        var prevExpandX = expandX;
        var prevExpandY = expandY;

        var newRight = Math.min(this.maxWidth, this.right + expandX);
        var newBottom = Math.min(this.maxHeight, this.bottom + expandY);

        expandX = newRight - this.right;
        expandY = newBottom - this.bottom;

        if (expandX < prevExpandX) {
            expandX = 0;
            newRight = this.right;
        }
        if (expandY < prevExpandY) {
            expandY = 0;
            newBottom = this.bottom;
        }

        var areaX = expandX * this.bottom;
        var areaY = this.right * expandY;

        var pow2X = Math.ceil(Math.log(this.right) * Math.LOG2E);
        var pow2Y = Math.ceil(Math.log(this.bottom) * Math.LOG2E);
        var deltaPow2X = Math.ceil(Math.log(newRight) * Math.LOG2E) - pow2X;
        var deltaPow2Y = Math.ceil(Math.log(newBottom) * Math.LOG2E) - pow2Y;

        var firstX = false;
        if (expandX > 0) {
            firstX = (deltaPow2X === deltaPow2Y) ? (areaX <= areaY) : (deltaPow2X < deltaPow2Y);
            firstX = firstX || expandY === 0;
        }

        var area = 0;
        var newAreaWidth = this.right;
        var newAreaHeight = this.bottom;

        var expandInfo = {
            expandX: 0,
            expandY: 0,
            area: 0,
            addNewBox: addNewBox,
            rightList: rightList,
            bottomList: bottomList,
        };

        if (expandX > 0 && (firstX || this.square)) {
            area += expandX * newAreaHeight;
            newAreaWidth = newRight;
            expandInfo.expandX = expandX;
        }
        if (expandY > 0 && (!firstX || this.square)) {
            area += expandY * newAreaWidth;
            newAreaHeight = newBottom;
            expandInfo.expandY = expandY;
        }

        expandInfo.area = area;

        return expandInfo;
    }

    Packer.prototype.expandFreeSpace = function(width, height, packRule) {
        if (this.right >= this.maxWidth && this.bottom >= this.maxHeight) {
            return false;
        }

        var info = this.getExpandInfo(width, height, packRule);
        if (this.allowRotate && width !== height) {
            var infoR = this.getExpandInfo(height, width, packRule);
            if (!info.area && !infoR.area) {
                return false;
            }
            if (infoR.area < info.area) {
                info = infoR;
            }
        }

        var addNewBox = info.addNewBox;
        var expandX = info.expandX;
        var expandY = info.expandY;

        var expand = false;

        if (expandX > 0) {
            if (addNewBox) {
                this.freeRectangles.push(new Rect(this.right, 0, expandX, this.bottom));
            } else {
                info.rightList.forEach(function(rect) {
                    rect.width += expandX;
                });
            }
            this.right += expandX;
            this._expandIndex++;
            expand = true;
        }

        if (expandY > 0) {
            if (addNewBox) {
                this.freeRectangles.push(new Rect(0, this.bottom, this.right, expandY));
            } else {
                info.bottomList.forEach(function(rect) {
                    rect.height += expandY;
                });
            }
            this.bottom += expandY;
            this._expandIndex++;
            expand = true;
        }

        return expand;
    }

    Packer.prototype.cloneRectangles = function(rectangles) {
        var newRectangles = [];

        rectangles.forEach((r, index) => {
            newRectangles.push({
                x: r.x,
                y: r.y,
                width: r.width,
                height: r.height,
            });
        });

        return newRectangles;
    }

    Packer.prototype.computeRectanglesInfo = function(rectangles) {
        var count = rectangles.length;
        var totalArea = 0;
        var totalWidth = 0;
        var totalHeight = 0;

        var maxWidth = -Infinity;
        var maxHeight = -Infinity;
        var minWidth = Infinity;
        var minHeight = Infinity;

        rectangles.forEach(function(rect) {
            var w = rect.width;
            var h = rect.height;

            totalArea += w * h;
            totalWidth += w;
            totalHeight += h;

            minWidth = Math.min(minWidth, w);
            minHeight = Math.min(minHeight, h);
            maxWidth = Math.max(maxWidth, w);
            maxHeight = Math.max(maxHeight, h);
        });

        var info = {
            count: count,

            totalArea: totalArea,
            totalWidth: totalWidth,
            totalHeight: totalHeight,

            minWidth: minWidth,
            minHeight: minHeight,
            minSide: Math.min(minWidth, minHeight),

            maxWidth: maxWidth,
            maxHeight: maxHeight,
            maxSide: Math.max(maxWidth, maxHeight),

        };

        var rat = info.totalWidth / info.totalHeight;
        var hySide = Math.ceil(Math.sqrt(info.totalArea));
        var hyHeight = Math.ceil(Math.sqrt(info.totalArea / rat));
        var hyWidth = Math.ceil(hyHeight * rat);

        info.hySide = hySide;
        info.hyWidth = hyWidth;
        info.hyHeight = hyHeight;

        // console.log(info)

        return info;
    }


    //////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////


    function _contactPointScoreBox(x, y, width, height, packer) {
        var usedRectangles = packer.usedRectangles;

        var score = 0;

        if (x === 0 || x + width === packer.maxWidth) {
            score += height;
        }
        if (y === 0 || y + height === packer.maxHeight) {
            score += width;
        }
        for (var i = 0; i < usedRectangles.length; i++) {
            var rect = usedRectangles[i];
            if (rect.x === x + width || rect.x + rect.width === x) {
                score += _commonIntervalLength(rect.y, rect.y + rect.height, y, y + height);
            }
            if (rect.y === y + height || rect.y + rect.height === y) {
                score += _commonIntervalLength(rect.x, rect.x + rect.width, x, x + width);
            }
        }
        return score;
    }

    function _commonIntervalLength(start0, end0, start1, end1) {
        if (end0 < start1 || end1 < start0) {
            return 0;
        }
        return Math.min(end0, end1) - Math.max(start0, start1);
    }


    //////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////

    var PrepareRule = {

        // TODO: with different pack rules , use different prepare rules.

        'default': function(rectangles, sortRule, packer) {

            if (sortRule !== false) {
                sortRule = sortRule || SORT.longSideDESC;
                rectangles.sort(sortRule);
            }

            var estimateWidth;
            var estimateHeight;

            // vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv

            // var info = packer._rectanglesInfo;
            // if (packer.square) {
            //     // TODO
            //     estimateWidth = Math.min(info.hySide, Math.min(packer.maxWidth, packer.maxHeight));
            //     estimateHeight = estimateWidth;
            // } else {
            //     // TODO
            //     estimateWidth = Math.min(info.hyWidth, packer.maxWidth);
            //     estimateHeight = Math.min(info.hyHeight, packer.maxHeight);
            // }
            // // estimateWidth = Math.ceil(estimateWidth >> 1);
            // // estimateHeight = Math.ceil(estimateHeight >> 1);


            // if (packer.square) {
            //     estimateWidth = Math.max(rectangles[0].width, rectangles[0].height);
            //     estimateHeight = estimateWidth
            // } else {
            if (rectangles[0]) {
                estimateWidth = rectangles[0].width;
                estimateHeight = rectangles[0].height;
            }
            // }

            // ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

            packer.right = packer.freeSpaceWidth || estimateWidth;
            packer.bottom = packer.freeSpaceHeight || estimateHeight;

            packer.right = Math.min(packer.maxWidth, packer.right);
            packer.bottom = Math.min(packer.maxHeight, packer.bottom);

            packer.freeRectangles.push(new Rect(0, 0, packer.right, packer.bottom));
        },
    }

    var FreeBoxSortRule = {
        'ShortSideFit': function(width, height, packer) {
            return function(a, b) {
                var x0 = a.width - width;
                var y0 = a.height - height;
                var x1 = b.width - width;
                var y1 = b.height - height;

                var shortSide0 = Math.min(x0, y0);
                var shortSide1 = Math.min(x1, y1);

                var d = shortSide0 - shortSide1;
                if (d) {
                    return d;
                }

                var longSide0 = Math.min(x0, y0);
                var longSide1 = Math.min(x1, y1);

                return longSide0 - longSide1;
            }
        },

        'LongSideFit': function(width, height, packer) {
            return function(a, b) {
                var x0 = a.width - width;
                var y0 = a.height - height;
                var x1 = b.width - width;
                var y1 = b.height - height;

                var longSide0 = Math.max(x0, y0);
                var longSide1 = Math.max(x1, y1);

                var d = longSide1 - longSide0;
                if (d) {
                    return d;
                }

                var shortSide0 = Math.min(x0, y0);
                var shortSide1 = Math.min(x1, y1);

                return shortSide1 - shortSide0;
            }
        },

        'AreaFit': function(width, height, packer) {
            return function(a, b) {
                var x0 = a.width - width;
                var y0 = a.height - height;
                var x1 = b.width - width;
                var y1 = b.height - height;

                var area0 = x0 * y0;
                var area1 = x1 * y1;

                return area0 - area1;
            }
        },

        'BottomLeft': function(width, height, packer) {
            return function(a, b) {
                var topSideY0 = a.y + height;
                var topSideY1 = b.y + height;

                var d = topSideY0 - topSideY1;
                if (d) {
                    return d;
                }

                return a.x - b.x;
            }
        },

        'ContactPoint': function(width, height, packer) {
            return function(a, b) {
                var score0 = _contactPointScoreBox(a.x, a.y, width, height, packer);
                var score1 = _contactPointScoreBox(b.x, b.y, width, height, packer);
                return score1 - score0;
            }
        },
    };


    // var InputRectSortRule = {
    //     'ShortSideFit': function(freeBox, packer) {
    //         var width = freeBox.width;
    //         var height = freeBox.height;
    //         return function(a, b) {
    //             var x0 = width - a.width;
    //             var y0 = height - a.height;
    //             var x1 = width - b.width;
    //             var y1 = height - b.height;

    //             var shortSide0 = Math.min(x0, y0);
    //             var shortSide1 = Math.min(x1, y1);

    //             var d = shortSide0 - shortSide1;
    //             if (d) {
    //                 return d;
    //             }

    //             var longSide0 = Math.min(x0, y0);
    //             var longSide1 = Math.min(x1, y1);

    //             return longSide0 - longSide1;
    //         }
    //     },

    //     'LongSideFit': function(freeBox, packer) {
    //         var width = freeBox.width;
    //         var height = freeBox.height;
    //         return function(a, b) {
    //             var x0 = width - a.width;
    //             var y0 = height - a.height;
    //             var x1 = width - b.width;
    //             var y1 = height - b.height;

    //             var longSide0 = Math.max(x0, y0);
    //             var longSide1 = Math.max(x1, y1);

    //             var d = longSide1 - longSide0;
    //             if (d) {
    //                 return d;
    //             }

    //             var shortSide0 = Math.min(x0, y0);
    //             var shortSide1 = Math.min(x1, y1);

    //             return shortSide1 - shortSide0;
    //         }
    //     },

    //     'AreaFit': function(freeBox, packer) {
    //         var width = freeBox.width;
    //         var height = freeBox.height;
    //         return function(a, b) {
    //             var x0 = width - a.width;
    //             var y0 = height - a.height;
    //             var x1 = width - b.width;
    //             var y1 = height - b.height;

    //             var area0 = x0 * y0;
    //             var area1 = x1 * y1;

    //             return area0 - area1;
    //         }
    //     },

    //     'BottomLeft': function(freeBox, packer) {
    //         var y = freeBox.y;
    //         return function(a, b) {
    //             var topSideY0 = y + a.height;
    //             var topSideY1 = y + b.height;

    //             var d = topSideY0 - topSideY1;
    //             if (d) {
    //                 return d;
    //             }

    //             return a.x - b.x;
    //         }
    //     },

    //     'ContactPoint': function(freeBox, packer) {
    //         var width = freeBox.width;
    //         var height = freeBox.height;
    //         return function(a, b) {
    //             var score0 = _contactPointScoreBox(a.x, a.y, width, height, packer);
    //             var score1 = _contactPointScoreBox(b.x, b.y, width, height, packer);
    //             return score1 - score0;
    //         }
    //     },
    // };


    //////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////

    var SORT = {
        widthASC: function(a, b) {
            return a.width - b.width || a.height - b.height;
        },
        widthDESC: function(a, b) {
            return b.width - a.width || b.height - a.height;
        },
        heightASC: function(a, b) {
            return a.height - b.height || a.width - b.width;
        },
        heightDESC: function(a, b) {
            return b.height - a.height || b.width - a.width;
        },
        shortSideASC: function(a, b) {
            var shortA = Math.min(a.width, a.height);
            var longA = Math.max(a.width, a.height);
            var shortB = Math.min(b.width, b.height);
            var longB = Math.max(b.width, b.height);
            return shortA - shortB || longA - longB;
        },
        shortSideDESC: function(a, b) {
            var shortA = Math.min(a.width, a.height);
            var longA = Math.max(a.width, a.height);
            var shortB = Math.min(b.width, b.height);
            var longB = Math.max(b.width, b.height);
            return shortB - shortA || longB - longA;
        },
        longSideASC: function(a, b) {
            var shortA = Math.min(a.width, a.height);
            var longA = Math.max(a.width, a.height);
            var shortB = Math.min(b.width, b.height);
            var longB = Math.max(b.width, b.height);
            return longA - longB || shortA - shortB;
        },
        longSideDESC: function(a, b) {
            var shortA = Math.min(a.width, a.height);
            var longA = Math.max(a.width, a.height);
            var shortB = Math.min(b.width, b.height);
            var longB = Math.max(b.width, b.height);
            return longB - longA || shortB - shortA;
        },
        areaASC: function(a, b) {
            var areaA = a.width * a.height;
            var areaB = b.width * b.height;
            return areaA - areaB || a.width - b.width || a.height - b.height;
        },
        areaDESC: function(a, b) {
            var areaA = a.width * a.height;
            var areaB = b.width * b.height;
            return areaB - areaA || b.width - a.width || b.height - a.height;
        },
        manhattanASC: function(a, b) {
            var manhattanA = a.width + a.height;
            var manhattanB = b.width + b.height;
            return manhattanA - manhattanB || a.width - b.width || a.height - b.height;
        },
        manhattanDESC: function(a, b) {
            var manhattanA = a.width + a.height;
            var manhattanB = b.width + b.height;
            return manhattanB - manhattanA || b.width - a.width || b.height - a.height;
        },
    }

    for (var ruleName in SORT) {
        SORT[ruleName].ruleName = ruleName;
    }

    //////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////

    var Rect = function(x, y, width, height) {
        this.x = x || 0;
        this.y = y || 0;
        this.width = width || 0;
        this.height = height || 0;
    }

    Rect.prototype.clone = function() {
        return new Rect(this.x, this.y, this.width, this.height);
    }

    Rect.isContainedIn = function(rectA, rectB) {
        return rectA.x >= rectB.x && rectA.y >= rectB.y &&
            rectA.x + rectA.width <= rectB.x + rectB.width &&
            rectA.y + rectA.height <= rectB.y + rectB.height;
    }


    //////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////

    // Positions the Rectangle against the short side of a free Rectangle into which it fits the best.
    exports.ShortSideFit = 'ShortSideFit';

    // Positions the Rectangle against the long side of a free Rectangle into which it fits the best.
    exports.LongSideFit = 'LongSideFit';

    // Positions the Rectangle into the smallest free Rectangle into which it fits.
    exports.AreaFit = 'AreaFit';

    // Does the Tetris placement.
    exports.BottomLeft = 'BottomLeft';

    // Choosest the placement where the Rectangle touches other Rectangles as much as possible.
    exports.ContactPoint = 'ContactPoint';

    exports.SORT = SORT;
    exports.Packer = Packer;

    if (typeof module !== "undefined" && module.exports) {
        module.exports = MaxRectsPacking;
    }

}(MaxRectsPacking));
