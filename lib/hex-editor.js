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

export default {

  hexEditorView: null,
  modalPanel: null,
  subscriptions: null,

  activate(state) {
    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'hex-editor:toggle': () => this.toggle()
    }));
  },

  deactivate() {
    this.subscriptions.dispose();
    this.hexEditorView.destroy();
  },

  toggle() {
  let editor
  if (editor = atom.workspace.getActivePaneItem()) {
      let fileTitle = editor.getTitle();
      let filePath = editor.getPath();
      if(filePath != undefined){
          let fileDir = filePath.substring(0,filePath.length - fileTitle.length);
          filenameNoExtension = '';

          if (fileTitle.slice(fileTitle.length-4, fileTitle.length) == '.hex'){
            let selection = editor.getText();
            var decoded = decodeHex(selection);

            storeInTab(decoded);

          }else{
            let newHexFilePath = fileDir + fileTitle + '.hex';
            let hexText = formatHex(toHex(filePath));

            storeInTab(hexText);

        }
      }
    }
  }
};
