/**
 * Created by akelley on 7/12/2017.
 */

//this library is a replacement for the "dicomParser.js" library so this project doesnt rely on other's code too heavily

//read transfer syntax

//once transfer syntax is read, read all the other data
//enter all data into an element with key xGGGGEEEE
//it should contain the location in the byte array, VR, the VL, and the parsed value(s) of the header

//save method: since all dicom data is headers (this is an assumption), the headers can simply be created into a new binary blob

//set value method: if value is already present change it, if not, create new header.

function DicomDataSet(byteArray) {
    //bytes 0-127 are 0's or something manufacturer specific
    //bytes 128-131 are 'DICM'
    if(!arrayEquals(new Uint8Array([68, 73, 67, 77]), sliceTypedArray(byteArray, 128, 132))) {
        console.log("File is not DICOM");
        //todo:: also throw an error
    }
    else {
        this.byteArray = byteArray;
        this.flags = 0;
        this.elements = [];
        var FileMetaInformationGroupLength = readElement(byteArray, 132, this.flags),
            headerLength = readUint16(byteArray, FileMetaInformationGroupLength.dataOffset, this.flags),
            headerEndIndex = 144 + headerLength,
            index = 132,
            element;
        while(index < headerEndIndex) {
            element = readElement(byteArray, index, this.flags);
            // if(element.tag.substring(1, 5) !== "0002") {
            //     break;
            // }
            // else {
            this.elements[element.tag] = element;
            index = element.dataOffset + element.length;
            // }
        }
        var TransferSyntax = this.text("x00020010");
        if(TransferSyntax === "1.2.840.10008.1.2") {
            //Implicit VR Endian: Default Transder Syntax for DICOM
            this.flags = IMPLICIT_VR;
        }
        else if(TransferSyntax === "1.2.840.10008.1.2.1") {
            //Explicit VR Little Endian
            this.flags = 0;
        }
        else if(TransferSyntax === "1.2.840.10008.1.2.2") {
            this.flags = BIG_ENDIAN;
        }
        index = headerEndIndex;
        while(index < byteArray.length) {
            element = readElement(byteArray, index, this.flags);
            this.elements[element.tag] = element;
            index = element.dataOffset + element.length;
        }
        this.Modality = this.text("x00080060");
        // console.log(this.Modality);
    }
}

DicomDataSet.prototype.uint16 = function(tag, index) {
    if(this.elements.hasOwnProperty(tag)) {
        if(index === undefined) {index = 0;}
        var element = this.elements[tag];
        return readUint16(element.valueBytes, index * 2, element.header ? 0 : this.flags); //if its a header element, use default flags
    }
    else {
        //todo:: throw an error
        console.log("elements does not have property " + tag);
    }
};

DicomDataSet.prototype.int16 = function(tag, index) {
    if(this.elements.hasOwnProperty(tag)) {
        if(index === undefined) {index = 0;}
        var element = this.elements[tag];
        return readInt16(element.valueBytes, index * 2, element.header ? 0 : this.flags); //if its a header element, use default flags
    }
    else {
        //todo:: throw an error
        console.log("elements does not have property " + tag);
    }
};

DicomDataSet.prototype.uint32 = function(tag, index) {
    if(this.elements.hasOwnProperty(tag)) {
        if(index === undefined) {index = 0;}
        var element = this.elements[tag];
        return readUint32(element.valueBytes, index * 4, element.header ? 0 : this.flags); //if its a header element, use default flags
    }
    else {
        //todo:: throw an error
        console.log("elements does not have property " + tag);
    }
};

DicomDataSet.prototype.int32 = function(tag, index) {
    if(this.elements.hasOwnProperty(tag)) {
        if(index === undefined) {index = 0;}
        var element = this.elements[tag];
        return readInt32(element.valueBytes, index * 4, element.header ? 0 : this.flags); //if its a header element, use default flags
    }
    else {
        //todo:: throw an error
        console.log("elements does not have property " + tag);
    }
};

DicomDataSet.prototype.float = function(tag, index) {
    if(this.elements.hasOwnProperty(tag)) {
        if(index === undefined) {index = 0;}
        var element = this.elements[tag];
        return readFloat(element.valueBytes, index * 4, element.header ? 0 : this.flags); //if its a header element, use default flags
    }
    else {
        //todo:: throw an error
        console.log("elements does not have property " + tag);
    }
};

DicomDataSet.prototype.double = function(tag, index) {
    if(this.elements.hasOwnProperty(tag)) {
        if(index === undefined) {index = 0;}
        var element = this.elements[tag];
        return readDouble(element.valueBytes, index * 8, element.header ? 0 : this.flags); //if its a header element, use default flags
    }
    else {
        //todo:: throw an error
        console.log("elements does not have property " + tag);
    }
};

DicomDataSet.prototype.stringArray = function(tag) {
    if(this.elements.hasOwnProperty(tag)) {
        var element = this.elements[tag];
        var strings = readString(element.valueBytes, 0, element.length, this.flags);
        return strings.split("\\");
    }
    else {
        //todo:: throw an error
        console.log("elements does not have property " + tag);
    }
};

DicomDataSet.prototype.string = function(tag, index) {
    if(index === undefined) {index = 0;}
    var stringArray = this.stringArray(tag);
    if(!stringArray) {
        return undefined;
    }
    else {
        return stringArray[index];
    }
};

DicomDataSet.prototype.textArray = function(tag) {
    var stringArray = this.stringArray(tag);
    for(var i = 0; i < stringArray.length; i++) {
        stringArray[i] = stringArray[i].replace(/\s+$/g, ""); //magic regex that removes trailing spaces
    }
    return stringArray;
};

DicomDataSet.prototype.text = function(tag, index) {
    if(index === undefined) {index  = 0;}
    var textArray = this.textArray(tag);
    if(!textArray) {
        return undefined;
    }
    else {
        return textArray[index];
    }
};

//on the below functions, the data validation is done by the string function so they do not need their own validation.
DicomDataSet.prototype.floatString = function(tag, index) {
    return parseFloat(this.string(tag, index));
};

DicomDataSet.prototype.floatStringArray = function(tag) {
    var stringArray = this.stringArray(tag), floatArray = new Array(stringArray.length);
    for(var i = 0; i < stringArray.length; i++) {
        floatArray[i] = parseFloat(stringArray[i]);
    }
    return floatArray;
};

DicomDataSet.prototype.intString = function(tag, index) {
    return parseInt(this.string(tag, index), 10);
};

DicomDataSet.prototype.intStringArray = function(tag) {
    var stringArray = this.stringArray(tag), intArray = new Array(stringArray.length);
    for(var i = 0; i < stringArray.length; i++) {
        intArray[i] = parseInt(stringArray[i], 10);
    }
    return intArray;
};

DicomDataSet.prototype.attributeTag = function(tag, index) {
    if(this.elements.hasOwnProperty(tag)) {
        if(index === undefined) {index = 0;}
        var element = this.elements[tag];
        return readAttributeTag(element.valueBytes, index*4, this.flags);
    }
    else {
        //todo:: throw an error
        console.log("elements does not have property " + tag);
    }
};

DicomDataSet.prototype.numStringValues = function(tag, index) {
    if(this.elements.hasOwnProperty(tag)) {
        if(index === undefined) {index = 0;}
        var element = this.elements[tag];
        var strings = readString(element.valueBytes, 0, element.length, this.flags);
        return strings.match(/\\/g).length + 1;
    }
    else {
        //todo:: throw an error
        console.log("elements does not have property " + tag);
    }
};

DicomDataSet.prototype.set = function(tag, vr, valueBytes) {
    this.elements[tag] = newElement(tag, vr, valueBytes, this.flags);
    //if the element already exists: overwrite
    //if it doesnt, create a new element
    //this single line solves both cases
};

DicomDataSet.prototype.save = function() {
    var totalLength = 132; //size of headers
    for(var key in this.elements) {
        if(this.elements.hasOwnProperty(key)) {
            totalLength += this.elements[key].bytes.length;
        }
    }
    var byteArray = new Uint8Array(totalLength);
    for(var i = 0; i < 128; i++) {
        byteArray.set(new Uint8Array([0]), i);
    }
    byteArray.set(new Uint8Array([68, 73, 67, 77]), 128);
    var index = 132;
    var keys = this.getSortedAttributes();
    for(var i = 0; i < keys.length; i++) {
        if(this.elements.hasOwnProperty(keys[i])) {
            byteArray.set(this.elements[keys[i]].bytes, index);
            index += this.elements[keys[i]].bytes.length;
        }
    }
    return byteArray;
};

const BIG_ENDIAN = 1,
    IMPLICIT_VR = 2,
    HEADER_ELEMENT = 4;

function Element() {
    this.dataOffset = 0; this.tag = "xFFFFFFFF"; this.length = 0; this.VR = null; this.bytes = null; this.valueBytes = null; this.header = false;
}

function readElement(byteArray, offset, flags) {
    var element = new Element();
    element.dataTagOffset = offset;
    element.tag = readAttributeTag(byteArray, offset, flags);
    if((flags & IMPLICIT_VR)) {
        element.length = readUint32(byteArray, offset + 4, flags);
        element.dataOffset = offset + 8;
        element.VR = null;
    }
    else {
        element.VR = readString(byteArray, offset + 4, 2, flags);
        if (byteArray[offset + 6] === 0 && byteArray[offset + 7] === 0) {
            element.length = readUint32(byteArray, offset + 8, flags);
            element.dataOffset = offset + 12;
        }
        else {
            element.dataOffset = offset + 8;
            element.length = readUint16(byteArray, offset + 6, flags);
        }
    }
    if(element.length === 0xFFFFFFFF) {
        //this means we are dealing with a sequence
        var endIndex = byteArrayIndexOf(byteArray, writeAttributeTag("xFFFEE0DD", flags), element.dataOffset) + 8;
        element.length = endIndex - element.dataOffset;
    }
    element.bytes = byteArray.subarray(element.dataTagOffset, element.dataOffset + element.length);
    element.valueBytes = byteArray.subarray(element.dataOffset, element.dataOffset + element.length);

    return element;
}

function newElement(tag, vr, valueBytes, flags) {
    var element = new Element();
    element.tag = tag;
    element.length = valueBytes.length;
    element.VR = vr;
    element.valueBytes = valueBytes;
    element.header = (tag.substring(1,5) === "0002");
    if(element.header) {flags = 0;}
    if(flags & IMPLICIT_VR) {
        element.bytes = new Uint8Array(8 + valueBytes.length);
        element.bytes.set(writeUint32(valueBytes.length, flags), 4);
        element.bytes.set(valueBytes, 8);
    }
    else {
        if(lengthLength(vr, flags) === 4) { //if the VR mandates a length of the length property of 4...
            element.bytes = new Uint8Array(12 + valueBytes.length);
            element.bytes.set([0, 0], 6);
            element.bytes.set(writeUint32(vr, flags), 8);
            element.bytes.set(valueBytes, 12);
        }
        else {
            element.bytes = new Uint8Array(8 + valueBytes.length);
            element.bytes.set(writeUint16(valueBytes.length, flags), 6);
            element.bytes.set(valueBytes, 8);
        }
        element.bytes.set(writeString(vr, flags), 4);
    }
    element.bytes.set(writeAttributeTag(tag, flags), 0);
    return element;
}



function readUint16(byteArray, offset, flags) {
    var arraySlice = sliceTypedArray(byteArray, offset, offset+2);
    //noinspection JSBitwiseOperatorUsage
    if(flags & BIG_ENDIAN) {arraySlice = arraySlice.reverse();}
    var array = new Uint16Array(arraySlice.buffer);
    return array[0];
}

function writeUint16(short, flags) {
    var typeArray = new Uint16Array([short]);
    if(flags & BIG_ENDIAN) {arraySlice = arraySlice.reverse();}
    return new Uint8Array(typeArray.buffer);
}

DicomDataSet.prototype.setUint16 = function(tag, value) {
    this.set(tag, "US", writeUint16(value, this.flags));
};

function readInt16(byteArray, offset, flags) {
    var arraySlice = sliceTypedArray(byteArray, offset, offset+2);
    if(flags & BIG_ENDIAN) {arraySlice = arraySlice.reverse();}
    var array = new Int16Array(arraySlice.buffer);
    return array[0];
}

function writeInt16(short, flags) {
    var typeArray = new Int16Array([short]);
    if(flags & BIG_ENDIAN) {arraySlice = arraySlice.reverse();}
    return new Uint8Array(typeArray.buffer);
}

DicomDataSet.prototype.setInt16 = function(tag, value) {
    this.set(tag, "SS", writeInt16(value, this.flags));
};

function readUint32(byteArray, offset, flags) {
    var arraySlice = sliceTypedArray(byteArray, offset, offset+4);
    if(flags & BIG_ENDIAN) {arraySlice = arraySlice.reverse();}
    var array = new Uint32Array(arraySlice.buffer);
    return array[0];
}

function writeUint32(int, flags) {
    var typeArray = new Uint32Array([int]);
    if(flags & BIG_ENDIAN) {arraySlice = arraySlice.reverse();}
    return new Uint8Array(typeArray.buffer);
}

DicomDataSet.prototype.setUint32 = function(tag, value) {
    this.set(tag, "UL", writeUint32(value, this.flags));
};

function readInt32(byteArray, offset, flags) {
    var arraySlice = sliceTypedArray(byteArray, offset, offset+4);
    if(flags & BIG_ENDIAN) {arraySlice = arraySlice.reverse();}
    var array = new Int32Array(arraySlice.buffer);
    return array[0];
}

function writeInt32(int, flags) {
    var typeArray = new Int32Array([int]);
    if(flags & BIG_ENDIAN) {arraySlice = arraySlice.reverse();}
    return new Uint8Array(typeArray.buffer);
}

DicomDataSet.prototype.setInt32 = function(tag, value) {
    this.set(tag, "SL", writeInt32(value, this.flags));
};

function readFloat(byteArray, offset, flags) {
    var arraySlice = sliceTypedArray(byteArray, offset, offset+4);
    if(flags & BIG_ENDIAN) {arraySlice = arraySlice.reverse();}
    var array = new Float32Array(arraySlice.buffer);
    return array[0];
}

function writeFloat(float, flags) {
    var typeArray = new Float32Array([float]);
    if(flags & BIG_ENDIAN) {arraySlice = arraySlice.reverse();}
    return new Uint8Array(typeArray.buffer);
}

DicomDataSet.prototype.setFloat = function(tag, value) {
    this.set(tag, "FL", writeInt16(value, this.flags));
};

function readDouble(byteArray, offset, flags) {
    var arraySlice = sliceTypedArray(byteArray, offset, offset+8);
    if(flags & BIG_ENDIAN) {arraySlice = arraySlice.reverse();}
    var array = new Float64Array(arraySlice.buffer);
    return array[0];
}

function writeDouble(double, flags) {
    var typeArray = new Float64Array([double]);
    if(flags & BIG_ENDIAN) {arraySlice = arraySlice.reverse();}
    return new Uint8Array(typeArray.buffer);
}

DicomDataSet.prototype.setDouble = function(tag, value) {
    this.set(tag, "FD", writeDouble(value, this.flags));
}
;

function readString(byteArray, offset, length, flags) {
    var s = "";
    for(var i = offset; i < offset + length; i++) {
        if(byteArray[i] !== 0) {
            s = s + String.fromCharCode(byteArray[i]);
        }
    }
    return s;
}
/**
 * Pads end of string with 1 or 0 NULL's to make string length even
 * @param string
 * @param padding charCode to pad with
 * @param flags
 */

function writePaddedString(string, padding, flags) {
    var outArray = new Uint8Array(string.length + string.length % 2);
    for(var i = 0; i < string.length; i++) {
        outArray.set([string.charCodeAt(i)], i);
    }
    if(string.length % 2 === 1) {
        outArray.set([padding], string.length);
    }
    return outArray;
}

function writeString(string, flags) {
    return writePaddedString(string, 0, flags);
}

DicomDataSet.prototype.setString = function (tag, vr, value) {
    this.set(tag, vr, writeString(value));
};
/**
 * Does not include trailing spaces
 * @param byteArray
 * @param offset
 * @param length
 * @param flags
 */
function readText(byteArray, offset, length, flags) {
    var t = "", endOfString = true;
    for(var i = offset + length - 1; i >= offset; i--) {
        //0x20 is space
        if(!(endOfString && byteArray[i] === 0x20) && byteArray[i] !== 0) {
            t = String.fromCharCode(byteArray[i])+t;
            endOfString = false;
        }
    }
    return t;
}

//write String works for text's too
function readFloatString(byteArray, offset, length, flags) {
    var string = readString(byteArray, offset, length, flags);
    return parseFloat(string);
}

function writeFloatString(float, flags) {
    var floatString = float.toString();
    if(floatString.length > 16) {
        floatString = floatString.substring(0, 16);
    }
    return writePaddedString(floatString, 0x20, flags);
}

DicomDataSet.prototype.setFloatString = function(tag, value) {
    this.set(tag, "DS", writeFloatString(value));
};

function readIntString(byteArray, offset, length, flags) {
    var string = readString(byteArray, offset, length, flags);
    return parseInt(string, 10);
}

function writeIntString(int, flags) {
    var intString = int.toString();
    if(intString.length > 12) {
        intString = intString.substring(0, 12);
    }
    return writePaddedString(intString, 0x20, flags);
}

DicomDataSet.prototype.setIntString = function(tag, value) {
    this.set(tag, "IS", writeIntString(value));
};

/**
 * returns attribute tag in
 * @param byteArray
 * @param offset
 * @param flags
 * @returns {string}
 */
function readAttributeTag(byteArray, offset, flags) {
    //Reads in the group group tag, converts to hex string, then pads with 0's so length is 4. Same for element
    var group = padString(readUint16(byteArray, offset, flags).toString(16), "0", 4),
        element = padString(readUint16(byteArray, offset+2, flags).toString(16), "0", 4);
    return "x" + group + element;
}

function writeAttributeTag(tag, flags) {
    //format xGGGGEEEE
    //get int values for g and e, then concatenate them in a new array
    var group = parseInt(tag.substring(1,5), 16),
        element = parseInt(tag.substring(5, 9), 16),
        newArray = new Uint8Array(4);
    newArray.set(writeUint16(group, flags), 0);
    newArray.set(writeUint16(element, flags), 2);
    return newArray;
}

function padString(string, padding, targetLength) {
    if(string.length > targetLength) {
        console.log("string: \"" + string + "\" longer than target length " + targetLength + ".");
        return string.substring(targetLength - string.length);
    }
    else {
        for(var i = 0, strlen = string.length; i < (targetLength - strlen); i++) {
            string = padding + string;
        }
        return string;
    }
}

// function stringToDicomEncoding(string) {
//     var outArray = new Uint8Array(string.length + string.length % 2);
//
//     for(var i = 0; i < string.length; i++) {
//         outArray.set([string.charCodeAt(i) & 0xFF], i);
//     }
//     if(string.length % 2 !== 0) {
//         outArray.set([0], string.length + 1);
//     }
//
//     return outArray;
// }
//todo:: this
// function dicomEncodingToString(byteArray) {
//     var outString = "";
//     for(var i = 0; i < byteArray.length; i++) {
//         outString += byteArray.
//     }
// }
function byteArrayIndexOf(bytesHay, bytesNeedle, startIndex) {
    for(var i = startIndex; i + bytesNeedle.length < bytesHay.length; i++) {
        if(partialArrayEquals(bytesNeedle, bytesHay, i)) {
            return i;
        }
    }
    return undefined;
}

function partialArrayEquals(array1, array2, a2start) {
    for(var i = 0; i < array1.length && i + a2start < array2.length; i++) {
        if(array1[i] !== array2[i+a2start]) {
            return false;
        }
    }
    return true;
}

function arrayEquals(array1, array2) {
    if(array1.length !== array2.length) {
        return false;
    }
    else {
        for(var i = 0; i < array1.length; i++) {
            if(array1[i] !== array2[i]) {
                return false;
            }
        }
        return true;
    }
}

function indexOfNth(string, needle, n) {
    if(n === 0) {
        return 0;
    }
    var needleCount = 0;
    for(var i = 0; i <= string.length - needle.length; i++) {
        if(string.substring(i, needle.length + i) === needle) {
            needleCount++;
            if(needleCount >= n) {
                return i;
            }
        }
    }
    return string.length;
}

function bytesIndexOfNth(bytesHay, bytesNeedle, n) {
    if(n === 0) {
        return 0;
    }
    var needleCount = 0;
    for(var i = startIndex; i + bytesNeedle.length < bytesHay.length; i++) {
        if(partialArrayEquals(bytesNeedle, bytesHay, i)) {
            needleCount ++;
            if(needleCount === n) {
                return i;
            }
        }
    }
    return bytesNeedle.length + 1;
}

function lengthLength(vr, flags) { //meta
    if(flags & IMPLICIT_VR) {
        return 4;
    }
    else {
        if(vr === "OB" || vr === "OW" || vr === "OF" || vr === "SQ" || vr === "UT" || vr === "UN") {
            return 4;
        }
        else {
            return 2;
        }
    }
}

DicomDataSet.prototype.getSortedAttributes = function() {
    var keys = [];
    for(key in this.elements) {
        keys.push(key);
    }
    return keys.sort(sortAttributeTags);
};

function sortAttributeTags(tag1, tag2) {
    var tag1Num = parseInt(tag1.substring(1,9), 16), tag2Num = parseInt(tag2.substring(1, 9), 16);
    return tag1Num - tag2Num;
}

function sliceTypedArray(array, begin, end) {
    var sliced = array.subarray(begin, end),
        newArray = new Uint8Array(end-begin);
    newArray.set(sliced, 0);
    return newArray;
}