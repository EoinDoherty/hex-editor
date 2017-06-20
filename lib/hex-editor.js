'use babel';

import { CompositeDisposable } from 'atom';

const fs = require('fs');

// function that decodes a hex dump string
function decodeHex(string){
  var deformatted = '';

  // split the file into lines
  var lines = string.split('\n');

  for(var i = 0; i < lines.length; i++){
    // eliminate whitespace and ignore line numbers to extract bytes of the file
    var bytes = lines[i].split(' ');
    for(var j = 0; j < bytes.length; j++){
      if(bytes[j].length < 7){
        deformatted += bytes[j];
      }
    }
  }

  // put the raw hex into a buffer and conver that into a string to decode
  var buff = Buffer.from(deformatted, 'hex');
  return buff.toString();
}

//function that appends a string to a tab
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

// Function that generates a hex dump from a file
function hexFromFile(path){
  var readStream = fs.createReadStream(path, 'hex');

  var lineNum = 0;
  var numBytes = 0;
  var line = "";
  var hd = "";

  // Open a new tab after openning a new read stream
  atom.workspace.open().then(function(t){
    readStream.on('data', function(buffer){
      // Convert the buffer into a string
      var buff = buffer.toString();

      // Split the string of the buffer into two character long chunks (bytes)
      for(var i = 0; i < buff.length; i += 2){
        line += buff.substring(i, i+2) + " ";
        numBytes ++;

        // If 16 bytes have been processed for this line...
        if(numBytes >= 16){
          numBytes = 0;

          // Create a new line by adding the line number to the 16 byte string
          hd += padLeft(lineNum.toString(16), "0", 6) + "0 " + line + "\n";
          line = "";
          lineNum ++;
        }
      }

      //insert that line
      t.insertText(hd);
      hd = "";
    });
    readStream.on('end', function(){
      // Insert the last line which may not be full
      t.insertText(padLeft(lineNum.toString(16), "0", 6) + "0 " + line + "\n");

      // Add an ending line that shows how many bytes the previous line contained if that line was not complete
      if(numBytes != 0){
        t.insertText(padLeft(lineNum.toString(16), "0", 6) + numBytes.toString(16) + " ");
      }
    });
  });
}

// Finds the hex dump of an untitled tab
function hexFromString(string){
  var buff = Buffer.from(string);
  var hexString = buff.toString('hex');

  var hd = "";
  var line = "";
  var lineNum = 0;
  var numBytes = 0;

  for(var i = 0; i < hexString.length; i += 2){
    line += hexString.substring(i, i + 2) + " ";
    numBytes ++;

    if(numBytes >= 16){
      numBytes = 0;
      hd += padLeft(lineNum.toString(16), "0", 6) + "0 " + line + "\n";
      line = "";
      lineNum ++;
    }
  }

  hd += padLeft(lineNum.toString(16), "0", 6) + "0 " + line + "\n";
  if(numBytes != 0){
    hd += padLeft(lineNum.toString(16), "0", 6) + numBytes.toString(16) + " ";
  }

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
      'hex-editor:encode': () => this.encode(),
      'hex-editor:decode': () => this.decode()
    }));
  },

  deactivate() {
    this.subscriptions.dispose();
    this.hexEditorView.destroy();
  },

  // Command that generates the hex dump of a file
  encode() {
    let editor;
    if (editor = atom.workspace.getActivePaneItem()) {
      let filePath = editor.getPath();
      if(filePath != undefined){
        hexFromFile(filePath);
      }else{
        let text = editor.getText();
        hexFromString(text);
      }
    }
  },

  // Command that converts a hex dump back to the original file
  decode() {
    let editor;
    if (editor = atom.workspace.getActivePaneItem()) {
      // get the contents of the editor as a string to make decoding unsaved files easier
      var selection = editor.getText();
      var decoded = decodeHex(selection);
      storeInTab(decoded);
    }
  }
};
