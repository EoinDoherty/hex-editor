'use babel';

import { CompositeDisposable } from 'atom';

const fs = require('fs');

// function that decodes a hex dump string
function decodeHex(string){
  var deformatted = '';

  // split the file into lines
  var lines = string.split('\n');

  for(var i = 0; i < lines.length; i++){
    // eliminate whitespace and ignore the first entry
    // where line numbers are and skip everything after |
    var bytes = lines[i].split(' ');
    for(var j = 1; j < bytes.length; j++){
      if(bytes[j] === "|")
        break;
      deformatted += bytes[j];
    }
  }

  // put the raw hex into a buffer and convert that into a string to decode
  var buff = Buffer.from(deformatted, 'hex');
  return buff.toString();
}

// function that appends a string to a tab
function storeInTab(text){
  atom.workspace.open().then(function(t){
    t.insertText(text);
  });
}

// Simple function to add a character to the left side of a string until length equals size
function padLeft(str, char, size){
  if(size > str.length){
    var padding = char.repeat(size - str.length);
    str = padding + str;
  }
  return str;
}

// function that formats hex into byte size chunks
// with line number and ascii
function dumpHexString(hexString, ctx, addLines){
  var hd = "";

  // Split the string of the buffer into two character long chunks (bytes)
  for(var i = 0; i < hexString.length; i += 2){
    var hex = hexString.substring(i, i + 2);
    var byte = parseInt(hex, 16);
    var ch = ".";

    ctx.line += hex + " ";
    ctx.numBytes ++;

    if (byte > 31 && byte < 127){
      ch = String.fromCharCode(byte);
    }

    ctx.ascii += ch;

    // If 16 bytes have been processed for this line...
    if(ctx.numBytes >= 16){
      ctx.numBytes = 0;

      // Create a new line by adding the line number to the 16 byte string
      hd += padLeft(ctx.lineNum.toString(16), "0", 6) + "0 " + ctx.line + "| " + ctx.ascii + "\n";
      ctx.linelen = ctx.line.length;
      ctx.line = "";
      ctx.ascii = "";
      ctx.lineNum ++;
    }
  }
  addLines(hd);
  return ctx;
}

// function that formats the last line of hex
function finishHexDump(ctx, addLine){
  if (ctx.linelen == 0){
    ctx.linelen = ctx.line.length;
  }

  // Insert the last line which may not be full
  addLine(padLeft(ctx.lineNum.toString(16), "0", 6) + "0 " + ctx.line.padEnd(ctx.linelen) + "| " + ctx.ascii + "\n");

  // Add an ending line that shows how many bytes the previous line contained if that line was not complete
  if(ctx.numBytes != 0){
    addLine(padLeft(ctx.lineNum.toString(16), "0", 6) + ctx.numBytes.toString(16) + " ");
  }

}

// Function that generates a hex dump from a file
function hexFromFile(path){
  var readStream = fs.createReadStream(path, 'hex');
  var ctx = {
    lineNum:  0,
    numBytes: 0,
    line: "",
    linelen: 0,
    ascii: ""
  };

  var hd = "";

  readStream.on('data', function(buffer){
    // Convert the buffer into a string
    var hexString = buffer.toString();

    ctx = dumpHexString(hexString, ctx, function (lines){
      hd += lines;
    });
  });
  readStream.on('end', function(){
    finishHexDump(ctx, function(line){
      hd += line;
    });
    storeInTab(hd);
  });
}

// Finds the hex dump of an untitled tab
function hexFromString(string){
  var buffer = Buffer.from(string);
  var hexString = buffer.toString('hex');
  var ctx = {
    lineNum:  0,
    numBytes: 0,
    line: "",
    linelen: 0,
    ascii: ""
  };
  var hd = "";

  ctx = dumpHexString(hexString, ctx, function (lines){
    hd += lines;
  });
  finishHexDump(ctx, function (line){
    hd += line;
  });
  storeInTab(hd);
}

export default {

  hexEditorView: null,
  modalPanel: null,
  subscriptions: null,

  activate(state) {
    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register commands
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'hex-view:encode': () => this.encode(),
      'hex-view:decode': () => this.decode()
    }));
  },

  deactivate() {
    this.subscriptions.dispose();
    this.hexEditorView.destroy();
  },

  // Command that generates the hex dump of a file
  encode() {
    let editor;
    if (editor = atom.workspace.getActivePaneItem()){
      let filePath = undefined
      let editorExists = false;

      try {
        filePath = editor.getPath();
        editorExists = true;
      }
      catch(err){
        alert('Open the file and select "Hex View: Encode" from the command pallet or use the keymap from the file\'s page.');
      }

      if(filePath != undefined){
        hexFromFile(filePath);
      }else if (editorExists){
        let text = editor.getText();
        hexFromString(text);
      }
    }
  },

  // Command that converts a hex dump back to the original file
  decode() {
    let editor;
    if (editor = atom.workspace.getActivePaneItem()){
      // get the contents of the editor as a string to make decoding unsaved files easier
      try{
        var selection = editor.getText();
        var decoded = "";
        try{
          decoded = decodeHex(selection);
        }
        catch(err){
          decoded = "Invalid hex";
        }
        storeInTab(decoded);
      }
      catch(err){
        alert('Open the file and select "Hex View: Decode" or use the keymap from the file\'s page.');
      }
    }
  }
};
