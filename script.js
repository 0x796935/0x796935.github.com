async function checkFileExtension() {
  const fileStatus = document.getElementById('fileStatus');
  fileStatus.innerHTML = 'Checking file extension...<br>';

  const fileInput = document.getElementById('fileInput');
  const file = fileInput.files[0];
  const fileName = file.name;
  const fileExtension = fileName.split('.').pop();
  const folderName = fileName.split('.').slice(0, -1).join('.');


  if (fileExtension === 'zip') {
    var zip = new JSZip();
    
    try {
      fileStatus.innerHTML += 'Unzipping file...<br>';
      await zip.loadAsync(file);
      // console.log(zip)
      
      // check if zip file contains a file with the name "${folderName}/level.dat0"
      const bLevelDatExists = zip.file(`${folderName}/level.dat0`) !== null;

      if(!bLevelDatExists){
        console.log("The .zip file does not contain a world save")
        fileStatus.innerHTML += 'Error: The .zip file does not contain a world save<br>';
        return "The .zip file does not contain a world save";
      }
      // list all level.dat files in the zip file
      var levelDatFiles = zip.file(/level\.dat\d+$/);
      // console.log(levelDatFiles)
      // console.log(`Found ${levelDatFiles.length} level.dat files in the .zip file`);
      fileStatus.innerHTML += `Found ${levelDatFiles.length} level.dat files in the .zip file<br>`;


      if(levelDatFiles.length < 1){
        console.log("The .zip doesn't contain a level.datX file")
        return "The .zip doesn't contain a level.datX file";
      }
      
      // read all level.dat files to byte array (like it would be read using fs.readFileSync)
      var levelDatFilesByteArray = [];
      for(let levelDatFile of levelDatFiles){
        // content should be hex array
        const content = await levelDatFile.async("uint8array");
        // const HexArray = Array.from(content, byte => byte.toString(16).padStart(2, '0'));
        // const HexBuffer = HexArray.join('');
        
        var inflatedLevelDat 
        try{
          console.log(`Inflating ${levelDatFile.name}`)
          fileStatus.innerHTML += `Inflating ${levelDatFile.name}<br>`;

          inflatedLevelDat = pako.inflate(content);
          // console.log(inflatedLevelDat)
          // convert inflatedLevelDat to hex string without Buffer becuase this is a browser
          const hexBuffer = new Uint8Array(inflatedLevelDat);
          var hex = Array.from(hexBuffer, byte => byte.toString(16).padStart(2, '0')).join('');
          // convert hex to ansii string
          const outputString = hex.match(/.{1,2}/g).map(byte => String.fromCharCode(parseInt(byte, 16))).join('');
          
          if(!outputString.includes("command-ran"))
            continue;

          // search all hex of: "FF FF 00 01 00"
          // search hex
          // while hexBuffer has 0xFF 0xFF 0x00 0x01 0x00\
          console.log(hex.indexOf('ffff000100'));
          
          while(hex.indexOf('ffff000100') !== -1) {
            hex = hex.replace(/ffff000100/g, 'ffff000000')
            console.log(`[+] Removed cheat flag from ${levelDatFile.name}`)
            fileStatus.innerHTML += `Removed cheat flag from ${levelDatFile.name}<br>`;
          }
          
          console.log(hex.indexOf('ffff000100'));

          // convert hex back to Uint8Array
          inflatedLevelDat = new Uint8Array(hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));

          // pako deflate 
          const deflatedLevelDat = pako.deflate(inflatedLevelDat);
          console.log(deflatedLevelDat)

          // write deflatedLevelDat to zip file
          zip.file(`${levelDatFile.name}`, deflatedLevelDat);
          console.log(zip.file(levelDatFile.name))

          zip = await zip.generateAsync({type:"blob"});

          // create download link and click it


        }catch(e) {
          console.log(e)
          fileStatus.innerHTML += `Error inflating ${levelDatFile.name}<br>`;
          return "Error inflating level.dat file";
        }

        levelDatFilesByteArray.push({name: levelDatFile.name, content: content, inflated: inflatedLevelDat});
      }

      // console
      console.log(`Found and changed ${levelDatFilesByteArray.length} level.dat files in the .zip file`);
      console.log(`The first level.dat file is:`)
      console.log(levelDatFilesByteArray[0].inflated);
      // html
      fileStatus.innerHTML += `Found and changed ${levelDatFilesByteArray.length} level.dat files in the .zip file<br>`;

    } catch (error) {
      fileStatus += 'Error reading the .zip file<br>';
      console.error('Error reading the .zip file:');
      console.log(error);
      return "Error reading the .zip file";
    }
  } else {
    console.log('The file is not a .zip file');
    return "The file is not a .zip file";
  }

  // create new blob and log url
  const blob = new Blob([zip], {type: "application/zip"});
  const url = URL.createObjectURL(blob);

  // create download link and click it
  var downloadLink = document.createElement('a');
  downloadLink.href = url;
  downloadLink.download = `${folderName}.zip`;

  fileStatus.innerHTML += `<a id="download" href="${url}">Download new Savegame</a><br>`;

  document.body.appendChild(downloadLink);
  console.log(`Download: ${url}`);

}
