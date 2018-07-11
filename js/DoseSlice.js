/**
 * Created by akelley on 7/5/2017.
 */
//todo:: Set bits allocated to be 16
function DoseSlice(mri, doses, MaxDose) {
    this.mri = mri;
    this.doses = doses;

    this.mri.dataSet.setUint16("x00280100", 16); //BitsAllocated = 16


    if(this.mri.Modality === "MR") {
        this.scaling = 1;
        this.mri.dataSet.setUint16("x00280101", 16); //BitsStored = 16
        this.mri.dataSet.setUint16("x00280102", 15); //HighBit = 15
        this.mri.dataSet.setUint16("x00280106", min2(this.mri.PixelData)); //SmallestImagePixelValue. //todo: THe min2 might take a while to run so it could be eliminated or calculated a different way (maybe).
        this.mri.dataSet.setUint16("x00280107", max2(this.mri.PixelData)); //LargestImagePixelValue
        this.mri.dataSet.setUint16("x00280108", 0); //SmallestImagePixelValueInSeries
        this.mri.dataSet.setUint16("x00280109", MaxDose); //LargestImagePixelValueInSeries
    }
    else if (this.mri.Modality === "CT") {
        this.scaling = MaxDose/4095;
        this.mri.dataSet.setUint16("x00280101", 12); //BitsStored = 12
        this.mri.dataSet.setUint16("x00280102", 11); //HighBit = 11
        this.mri.dataSet.setFloatString("x00281050", MaxDose/2); //WindowCenter
        this.mri.dataSet.setFloatString("x00281051", MaxDose); //WindowWidth
        this.mri.dataSet.setFloatString("x00281052", 0); //RescaleIntercept = 0;
        this.mri.dataSet.setFloatString("x00281053", this.scaling); //RescaleSlope = 1;
    }
    this.mri.scaling = this.scaling;

        // var start = new Date();
    //     translationMatrices = new Array(doses.length);
    // for(var i = 0; i < this.doses; i++) {
    //     //(doseMatrix * mriMatrix^-1) * x. Converts x from mri coordinates to normal coordinates to dose coordinates.
    //     translationMatrices[i] = multMatrix(this.doses[i].OrientationMatrix, this.mri.InverseOrientationMatrix);
    //     console.log(translationMatrices[i]);
    // }
    this.PixelData = new Array(this.mri.Rows);
    for(var r = 0; r < this.mri.Rows; r++) {
        //mri.BitsALlocated must be one of or 8, 16, 32;
        if(mri.BitsAllocated === 8) {
            this.PixelData[r] = new Uint8Array(this.mri.Columns);
        }
        else if(mri.BitsAllocated === 16) {
            this.PixelData[r] = new Uint16Array(this.mri.Columns);
        }
        else {
            this.PixelData[r] = new Uint32Array(this.mri.Columns);
        }
        for(var c = 0; c < this.mri.Columns; c++) {
            var pointDose = 0;
            // var point = mri.getPointForCoordinate(r, c),
            var coordPoint = this.mri.relativePointForRowCol(r, c);
                // coordPoint = translateAboutPoint(this.mri.ImagePositionPatient,
                //     this.mri.OrientationMatrix,
                //     [point[0], point[1], this.mri.SliceLocation]);
            // console.log(point);
            // console.log(coordPoint);
            //multiple doses get summed
            for(var i = 0; i < doses.length; i++) {
                // var dosePoint = translateAboutPoint(this.doses[i].ImagePositionPatient, this.doses[i].InverseOrientationMatrix, coordPoint);
                // pointDose += this.doses[0].getValueAt(dosePoint[0], dosePoint[1], dosePoint[2]);
                pointDose += this.doses[0].getValueAt(coordPoint[0], coordPoint[1], coordPoint[2]);
            }
            this.PixelData[r][c] = Math.round(pointDose/this.scaling);
        }
    }
    // var end = new Date();
    // console.log(end-start);
    // console.log(this.PixelData);

    // var endIndex = this.mri.pixelDataElement.dataOffset;
    // // console.log(this.mri.dataSet.byteArray.slice(0, endIndex).length);
    // var byteArray = new Uint8Array(endIndex - 0 + this.mri.BitsAllocated / 8 * this.PixelData.length * this.PixelData[0].length);
    // // console.log(byteArray.length);
    // byteArray.set(this.mri.dataSet.byteArray.slice(0, endIndex));
    // for(var i = 0; i < this.PixelData.length; i++) {
    //     byteArray.set(new Uint8Array(this.PixelData[i].buffer), endIndex + 2*this.PixelData[0].length*i);
    // }
    // // console.log(byteArray);
    //
    // var maxDose = doses[0].MaxDose,
    //     minDose = doses[0].MinDose;
    //
    // for(var i = 1; i < doses.length; i++) {
    //     if(doses[i].MaxDose > maxDose) {
    //         maxDose = doses[i].MaxDose;
    //     }
    //     if(doses[i].MinDose < minDose) {
    //         minDose = doses[i].MinDose;
    //     }
    // }
    // this.mri.dataSet.byteArray = byteArray;
    // set(this.mri.dataSet, "x00280106", shortToBytes(min2(this.PixelData), this.mri.bigEndian), this.mri.bigEndian, true); //SmallestImagePixelValue
    // set(this.mri.dataSet, "x00280107", shortToBytes(max2(this.PixelData), this.mri.bigEndian), this.mri.bigEndian, true); //LargestImagePixelValue
    // set(this.mri.dataSet, "x00280108", shortToBytes(minDose, this.mri.bigEndian), this.mri.bigEndian, true); //SmallestImagePixelValueInSeries
    // set(this.mri.dataSet, "x00280109", shortToBytes(maxDose, this.mri.bigEndian), this.mri.bigEndian, true); //LargestImagePixelValueInSeries

    var newPixelData = new Uint8Array(this.mri.BitsAllocated / 8 * this.PixelData.length * this.PixelData[0].length);
    for(var i = 0; i < this.PixelData.length; i++) {
        newPixelData.set(new Uint8Array(this.PixelData[i].buffer), 2*this.PixelData[0].length*i);
    }

    this.mri.dataSet.set("x7fe00010", "OB", newPixelData);

    // var maxDose = doses[0].MaxDose,
    //     minDose = doses[0].MinDose;
    //
    // for(var i = 1; i < doses.length; i++) {
    //     if(doses[i].MaxDose > maxDose) {
    //         maxDose = doses[i].MaxDose;
    //     }
    //     if(doses[i].MinDose < minDose) {
    //         minDose = doses[i].MinDose;
    //     }
    // }
    //todo:: Set window level and rescale stuff
}

// function shortToBytes(short, bigEndian) {
//     if(bigEndian) {
//         return new Uint8Array([short >> 8, short]);
//     }
//     else {
//         return new Uint8Array([short, short >> 8]);
//     }
// }
//
// function intToBytes(int, bigEndian) {
//     if(bigEndian) {
//         return new Uint8Array([int >> 24, int >> 16, int >> 8, int]);
//     }
//     else {
//         return new Uint8Array([int, int >> 8, int >> 16, int >> 24]);
//     }
// }

function min2(array) {
    var min = Number.MAX_VALUE;

    for(var x = 0; x < array.length; x++) {
        for(var y = 0; y < array[x].length; y++) {
            if(!isNaN(array[x][y]) && array[x][y] < min) {
                min = array[x][y];
            }
        }
    }

    return min;
}

function max2(array) {
    var max = 0;

    for(var x = 0; x < array.length; x++) {
        for(var y = 0; y < array[x].length; y++) {
            if(!isNaN(array[x][y]) && array[x][y] > max) {
                max = array[x][y];
            }
        }
    }

    return max;
}

DoseSlice.prototype.blob = function() {
    return new Blob([this.mri.dataSet.save()], {type:"application/dicom"});
};

// DataSet.prototype.set = function(elementId, bytes) {
//     if(dataSet.hasOwnProperty(elementId)) {
//         var element = this[elementId],
//             lengthChange = bytes.length - element.length,
//             newByteArray = new Uint8Array(this.byteArray.length + lengthChange);
//         newByteArray.set(this.byteArray.slice(0, element.dataOffset), 0);
//         newByteArray.set(bytes, element.dataOffset);
//         newByteArray.set(this.byteArray.slice(element.dataOffset + element.length, this.byteArray.length), element.dataOffset + bytes.length);
//
//         //todo:: possible optimization: if the elements are sorted, then the program could just go to the elements and start increasing their dataOffset, rather than have to check if the dataOffset is bigger than element.dataOffset
//         if (lengthChange !== 0) {
//             for (var e in dataSet.elements) {
//                 if (dataSet.hasOwnProperty(e)) {
//                     if (dataSet.elements[e].dataOffset > element.dataOffset) {
//                         dataSet.elements[e].dataOffset += lengthChange;
//                     }
//                 }
//             }
//         }
//     }
//     else {
//         console.log("Could not set " + elementId);
//     }
// };


// function set(dataSet, elementId, bytes, bigEndian, sixteenBitLength) {
//     if(dataSet.elements.hasOwnProperty(elementId)) {
//         var element = dataSet.elements[elementId],
//             lengthChange = bytes.length - element.length,
//             newByteArray = new Uint8Array(dataSet.byteArray.length + lengthChange);
//         newByteArray.set(dataSet.byteArray.slice(0, element.dataOffset), 0);
//         if(lengthChange !== 0) {
//             // console.log("Length change = " + lengthChange + " for element " + elementId);
//             var lengthArray;
//             if (bigEndian) {
//                 if (sixteenBitLength) {
//                     lengthArray = new Uint8Array([bytes.length >>> 8, bytes.length]);
//                 }
//                 else {
//                     lengthArray = new Uint8Array([bytes.length >>> 24, bytes.length >>> 16, bytes.length >>> 8, bytes.length]);
//                 }
//             }
//             else {
//                 if (sixteenBitLength) {
//                     lengthArray = new Uint8Array([bytes.length, bytes.length >>> 8]);
//                 }
//                 else {
//                     lengthArray = new Uint8Array([bytes.length, bytes.length >>> 8, bytes.length >>> 16, bytes.length >>> 24]);
//                 }
//             }
//             // console.log(lengthArray);
//             newByteArray.set(lengthArray, element.dataOffset - (sixteenBitLength ? 2 : 4));
//         }
//         newByteArray.set(bytes, element.dataOffset);
//         newByteArray.set(dataSet.byteArray.slice(element.dataOffset + element.length), element.dataOffset + bytes.length);
//
//         dataSet.byteArray = newByteArray;
//         //todo:: possible optimization: if the elements are sorted, then the program could just go to the elements and start increasing their dataOffset, rather than have to check if the dataOffset is bigger than element.dataOffset
//
//         if (lengthChange !== 0) {
//             element.length = bytes.length;
//             for (var e in dataSet.elements) {
//                 if (dataSet.elements.hasOwnProperty(e)) {
//                     if (dataSet.elements[e].dataOffset > element.dataOffset) {
//                         dataSet.elements[e].dataOffset += lengthChange;
//                     }
//                 }
//             }
//         }
//     }
//     else {
//         console.log("Could not set " + elementId);
//     }
// }
//
// function insert(dataSet, elementId, VR, bytes, bigEndian, sixteenBitLength) {
//     if(dataSet.elements.hasOwnProperty(elementId)) {
//         //if the dataset does contain the property, run the method designed to override that property
//         set(dataSet, elementId, bytes, bigEndian, sixteenBitLength);
//     }
//     else {
//         var vrDefined = !(VR === null || VR === undefined);
//         //...I should have just found the element after and then started indexing from there... but whatever this works.
//         var prevElementId = findMaxElementLessThan(elementId, dataSet);
//         var prevElement = dataSet.elements[prevElementId],
//             newElementOffset = prevElement.dataOffset + prevElement.length,
//             newElementSize = 4 + (vrDefined ? 2 : 0) + (sixteenBitLength ? 2 : 4) + bytes.length,
//             newByteArray = new Uint8Array(dataSet.byteArray.length + newElementSize),
//             elementTagBytes = keyToBytes(elementId, bigEndian),
//             lengthArray;
//         if(sixteenBitLength) {
//             lengthArray = shortToBytes(bytes.length, bigEndian);
//         }
//         else {
//             lengthArray = shortToBytes(bytes.length, bigEndian);
//         }
//         // console.log(newElementOffset);
//         // console.log(prevElement.length);
//         newByteArray.set(dataSet.byteArray.slice(0, newElementOffset), 0);
//         newByteArray.set(elementTagBytes, newElementOffset);
//         if(vrDefined) {
//             newByteArray.set(new Uint8Array([VR.charCodeAt(0), VR.charCodeAt(1)]), newElementOffset + 4);
//         }
//         newByteArray.set(lengthArray, newElementOffset + 4 + (vrDefined ? 2 : 0));
//         newByteArray.set(bytes, newElementOffset + 4 + (vrDefined ? 2 : 0) + (sixteenBitLength ? 2 : 4));
//         newByteArray.set(dataSet.byteArray.slice(newElementOffset), newElementOffset + newElementSize);
//
//         dataSet.byteArray = newByteArray;
//         // console.log(newByteArray);
//         for (var e in dataSet.elements) {
//             if (dataSet.elements.hasOwnProperty(e)) {
//                 if (dataSet.elements[e].dataOffset >= newElementOffset) {
//                     dataSet.elements[e].dataOffset += newElementSize;
//                 }
//             }
//         }
//     }
// }

// function findMaxElementLessThan(elementId, dataSet) {
//     var greatestInt = 0, elementInt = keyToInt(elementId);
//     // console.log(elementInt);
//     // console.log(Object.keys(dataSet.elements));
//     for(var key in dataSet.elements) {
//         //key < elementId && key > greatest
//         var keyInt = keyToInt(key);
//         // console.log(key +", "+keyInt);
//         if (keyInt < elementInt && keyInt > greatestInt) {
//             // console.log(key);
//             greatestInt = keyInt;
//         }
//     }
//     console.log(greatestInt);
//     return intToKey(greatestInt);
// }
//
// function keyToBytes(key, bigEndian) {
//     var keyInt = keyToInt(key);
//     if(bigEndian) {
//         return new Uint8Array([keyInt >> 24, keyInt >> 16, keyInt >> 8, keyInt]);
//     }
//     else {
//         return new Uint8Array([keyInt >> 16, keyInt >> 24, keyInt, keyInt >> 8]);
//     }
// }

function keyToInt(key) {
    return parseInt(key.substring(1), 16);
}

function intToKey(int) {
    var intString = int.toString(16), len = intString.length;
    //pads with front 0's
    for(var i = 0; i < (8-len); i++) {
        intString = "0" + intString;
    }
    return "x" + intString;
}

function encodeString(string) {
    //makes sure that string has an even number of bytes
//        var byteArray = new Uint8Array(string.length + string.length % 2);
//        console.log(byteArray.length);
//        for(var i = 0; i < string.length; i++) {
//            byteArray.set([string.charCodeAt(i)], i);
//        }
//        console.log(byteArray);
//        return byteArray;
    var array = [];
    for(var i = 0; i < string.length; i++) {
        var code = string.charCodeAt(i);
        if(0 <= code && code < 128) {
            array.push(code);
        }
    }
    if(array.length % 2 !== 0) {
        array.push(0);
    }
    return new Uint8Array(array);
}