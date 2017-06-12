'use babel';

import { CompositeDisposable } from 'atom';

const fs = require('fs');

function toHex(filename){
  var data = fs.readFileSync(filename);

  return data
}

function formatHex(arr){
  var finalString = '0000000 ';
  var lineNumber = 1;
  var lastLineLength = 0;
  for (var i = 0; i < arr.length; i++){
    var byte = arr[i].toString(16);

    if (byte.length == 1){
      byte = '0' + byte;
    }
    if ((i+1) % 16 == 0 && i != 0){
      var formattedLnNum = lineNumber.toString(16) + '0';
      while (formattedLnNum.length < 7){
        formattedLnNum = '0' + formattedLnNum;
      }
      finalString += byte + ' ' + '\n'+ formattedLnNum + ' ';
      lineNumber += 1;
      lastLineLength = 0;
    }
    else{
      finalString += byte + ' ';
      lastLineLength += 1;
    }
  }
  var footerNumber = (lineNumber-1).toString(16)+lastLineLength.toString(16);
  while (footerNumber.length < 7){
    footerNumber = '0'+footerNumber;
  }
  finalString += '\n' + footerNumber + '\n';
  finalString = finalString.toLowerCase();
  return finalString
}

function decodeHex(string){
  var deformatted = ''
  var listified = string.split(' ');
  for (var i = 0; i < listified.length; i++){
    if (listified[i].length < 7){
      deformatted += listified[i];
    }
  }
  //  'sko
  var buff = Buffer.from(deformatted, 'hex');
  return buff.toString();
}

function decodeHexAndStore(string, path){
  var deformatted = '';
  var listified = string.split(' ');
  for (var i = 0; i < listified.length; i++){
    if (listified[i].length < 7){
      deformatted += listified[i];
    }
  }

  var buff = Buffer.from(deformatted, 'hex');
  fs.writeFile(path, buff, function(err){})
}

function storeInFile(path, content){
  fs.writeFile(path, content, function (err){
      if (err){
        alert(err);
      }
    }
  );
}

function storeInTab(text){
    atom.workspace.open().then(function(t){
        t.insertText(text);
    });
}

function padLeft(size, str, char){
  if(size > str.length){
    while(str.length < size - 1){
      str = char + str;
    }
  }
  return str;
}

function hexFromFile(path){
  var readStream = fs.createReadStream(path, 'hex');

  var lineNum = 0;
  var numBytes = 0;
  var line = "";
  var hd = "";

  atom.workspace.open().then(function(t){
    readStream.on('data', function(buffer){
      var buff = buffer.toString();
      for(var i = 0; i < buff.length; i += 2){
        line += buff.substring(i, i+2) + " ";
        numBytes ++;
        if(numBytes >= 16){
          numBytes = 0;

          hd += padLeft(7, lineNum.toString(16), "0") + "0" + " " + line + "\n";
          line = "";
          lineNum ++;
        }
      }
      t.insertText(hd);
      hd = "";
    });
    readStream.on('end', function(){
      t.insertText(padLeft(7, lineNum.toString(16), "0") + "0" + " " + line + "\n");
      if(numBytes != 0){
        t.insertText(padLeft(7, lineNum.toString(16), "0") + numBytes.toString(16) + " ");
      }
    });
  });
}

export default {

  hexEditorView: null,
  modalPanel: null,
  subscriptions: null,

  activate(state) {
    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'hex-editor:toggle': () => this.toggle(),
      'hex-editor:decode': () => this.decode()
    }));
  },

  deactivate() {
    this.subscriptions.dispose();
    this.hexEditorView.destroy();
  },

  toggle() {
    let editor;
    if (editor = atom.workspace.getActivePaneItem()) {
      let fileTitle = editor.getTitle();
      let filePath = editor.getPath();
      if(filePath != undefined){
        hexFromFile(filePath);
      }
    }
  },

  decode() {
    let editor;
    if (editor = atom.workspace.getActivePaneItem()) {
      var selection = editor.getText();
      var decoded = decodeHex(selection);
      storeInTab(decoded);
    }
  }
};
