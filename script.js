import { fileMappings } from './mappings.js';

document.getElementById('fileInput').addEventListener('change', function () {
    const outputDiv = document.getElementById('output');
    const fileInput = document.getElementById('fileInput');

    if (fileInput.files.length > 0) {
        const fileName = fileInput.files[0].name;
        outputDiv.textContent = `Selected file: ${fileName}`;
        console.log(`File selected: ${fileName}`);
    }
});

async function convertPack() {
    const fileInput = document.getElementById('fileInput');
    const outputDiv = document.getElementById('output');

    if (fileInput.files.length === 0) {
        outputDiv.textContent = "Please upload a Java Texture Pack first.";
        console.log("No file uploaded.");
        return;
    }

    const file = fileInput.files[0];
    if (!file.name.endsWith('.zip')) {
        outputDiv.textContent = "Invalid file format. Please upload a .zip file.";
        console.log("Invalid file format: " + file.name);
        return;
    }

    const zip = new JSZip();
    const startTime = performance.now();
    try {
        const contents = await zip.loadAsync(file);
        updateOutput("ZIP file loaded successfully.");
        console.log("ZIP file loaded successfully.");

        const bedrockZip = new JSZip();
        let manifestDescription = "";
        let foundAssets = false;

        for (let fileName in contents.files) {
            if (fileName.includes("assets/minecraft/textures/")) {
                foundAssets = true;
                break;
            }
        }

        if (!foundAssets) {
            outputDiv.textContent = "The assets/minecraft/textures folder was not found in the ZIP.";
            console.log("assets/minecraft/textures folder not found.");
            return;
        }

        for (let fileName in contents.files) {
            const file = contents.files[fileName];

            if (!file.dir) {
                if (fileName.includes("assets/minecraft/textures/entity/") ||
                    fileName.includes("assets/minecraft/textures/gui/") ||
                    fileName.includes("assets/minecraft/textures/font/")) {
                    continue;
                }

                if (fileName.endsWith("pack.png")) {
                    const data = await file.async("blob");
                    bedrockZip.file("pack_icon.png", data);
                    console.log("pack.png file added as pack_icon.png");
                } else if (fileName.endsWith("pack.mcmeta")) {
                    const mcmetaContent = await file.async("text");
                    const mcmeta = JSON.parse(mcmetaContent);
                    manifestDescription = mcmeta.pack.description;
                    console.log("pack.mcmeta file found and description updated.");
                } else if (fileName.includes("assets/minecraft/textures/")) {
                    let newFileName = fileName.replace(/.*assets\/minecraft\/textures\//, "textures/");

                    // Handle block, item, and entity path changes
                    newFileName = newFileName.replace("/block/", "/blocks/").replace("/item/", "/items/").replace("/entity/", "/entity/");

                    // Handle specific file name changes using mappings from mappings.js
                    for (const [javaName, bedrockName] of Object.entries(fileMappings)) {
                        if (newFileName.includes(javaName)) {
                            newFileName = newFileName.replace(javaName, bedrockName);
                            break;
                        }
                    }

                    const data = await file.async("blob");
                    bedrockZip.file(newFileName, data);
                    console.log(`File converted: ${fileName} -> ${newFileName}`);
                }
            }
        }

        // Process entity folder separately
        for (let fileName in contents.files) {
            if (fileName.includes("assets/minecraft/textures/entity/")) {
                let newFileName = fileName.replace(/.*assets\/minecraft\/textures\/entity\//, "textures/entity/");

                for (const [javaName, bedrockName] of Object.entries(fileMappings)) {
                    if (newFileName.includes(javaName)) {
                        newFileName = newFileName.replace(javaName, bedrockName);
                        break;
                    }
                }

                const data = await contents.files[fileName].async("blob");
                bedrockZip.file(newFileName, data);
                console.log(`Entity File converted: ${fileName} -> ${newFileName}`);
            }
        }

        const packName = file.name.replace('.zip', '');
        const fullDescription = `${manifestDescription}\nPorted by Pepe's Pack Porter.`;

        const manifest = generateManifest(packName, fullDescription);
        bedrockZip.file("manifest.json", JSON.stringify(manifest, null, 4));
        console.log("manifest.json file created.");

        const blob = await bedrockZip.generateAsync({ type: "blob" });
        const endTime = performance.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        
        const newFileName = file.name.replace('.zip', ' [Converted].zip');
        saveAs(blob, newFileName);
        
        updateOutput(`Conversion complete! Your download should start shortly. Time taken: ${duration} seconds.`);
        console.log(`Conversion complete! Time taken: ${duration} seconds.`);
    } catch (error) {
        updateOutput("Error loading ZIP file: " + error);
        console.error("Error loading ZIP file: " + error);
    }
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function generateManifest(name, description) {
    return {
        "format_version": 2,
        "header": {
            "name": name,
            "description": description,
            "uuid": generateUUID(),
            "version": [1, 0, 0],
            "min_engine_version": [1, 20, 0]
        },
        "modules": [
            {
                "type": "resources",
                "uuid": generateUUID(),
                "version": [1, 0, 0]
            }
        ]
    };
}

function updateOutput(message) {
    const outputDiv = document.getElementById('output');
    const p = document.createElement('p');
    p.textContent = message;
    outputDiv.appendChild(p);
    console.log(message);
}