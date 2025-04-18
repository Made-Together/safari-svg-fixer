// This is the main code for the Figma plugin UI
// code.js
figma.showUI(__html__, { width: 320, height: 340 });

figma.ui.onmessage = async (msg) => {
  if (msg.type === "fix-effects") {
    const selection = figma.currentPage.selection;
    console.log(
      "Selected nodes:",
      selection.map((n) => ({ id: n.id, name: n.name, type: n.type }))
    );

    if (selection.length === 0) {
      figma.notify("Please select at least one frame");
      return;
    }

    try {
      let totalFixedCount = 0;

      // Process each selected top-level node separately
      for (const selectedNode of selection) {
        if (selectedNode.type !== "FRAME") {
          console.log(`Skipping ${selectedNode.name} - not a frame`);
          continue;
        }

        console.log(
          `Processing selected node: ${selectedNode.name} (${selectedNode.id})`
        );

        // Process this node and all its children recursively
        const fixedCount = await processNodeHierarchy(selectedNode);
        totalFixedCount += fixedCount;
      }

      figma.notify(`Fixed ${totalFixedCount} frames with effects`);
    } catch (error) {
      console.error("Error:", error);
      figma.notify(`Error: ${error.message}`);
    }
  }

  if (msg.type === "compress-images") {
    const selection = figma.currentPage.selection;
    console.log(
      "Selected nodes for image compression:",
      selection.map((n) => ({ id: n.id, name: n.name, type: n.type }))
    );

    if (selection.length === 0) {
      figma.notify("Please select at least one frame containing images");
      return;
    }

    try {
      let compressedCount = 0;

      // Process each selected top-level node separately
      for (const selectedNode of selection) {
        console.log(
          `Processing node for image compression: ${selectedNode.name}`
        );

        // Process this node and all its children recursively
        const count = await compressImagesInNode(selectedNode);
        compressedCount += count;
      }

      if (compressedCount > 0) {
        figma.notify(`Compressed ${compressedCount} images`);
      } else {
        figma.notify("No images found that needed compression");
      }
    } catch (error) {
      console.error("Error compressing images:", error);
      figma.notify(`Error: ${error.message}`);
    }
  }

  if (msg.type === "preview") {
    const selection = figma.currentPage.selection;
    console.log("Preview requested for selection:", selection);

    if (selection.length === 0) {
      figma.notify("Please select at least one frame");
      return;
    }

    try {
      // Create a temporary frame to hold all selected nodes
      const tempFrame = figma.createFrame();
      tempFrame.name = "Preview Frame";

      // Copy all selected nodes into the temporary frame
      for (const node of selection) {
        const clone = node.clone();
        tempFrame.appendChild(clone);
      }

      // Export the frame as SVG
      const svgBytes = await tempFrame.exportAsync({
        format: "SVG",
      });

      // Convert SVG bytes to string and ensure it's valid SVG
      const svgString = String.fromCharCode.apply(null, svgBytes);
      console.log("SVG Content:", svgString); // Debug log

      // Create HTML content for preview
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Safari SVG Preview</title>
  <style>
    body {
      margin: 0;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      background: #f5f5f5;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    .preview-section {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 20px;
      background: white;
      margin-top: 20px;
    }
    h1 {
      margin: 0 0 20px;
      font-size: 24px;
    }
    h2 {
      margin: 0 0 10px;
      font-size: 18px;
      color: #333;
    }
    .preview-image {
      max-width: 100%;
      height: auto;
      border: 1px solid #eee;
      border-radius: 4px;
      padding: 20px;
      background: white;
    }
    pre {
      background: #f8f8f8;
      padding: 15px;
      border-radius: 4px;
      overflow-x: auto;
      font-size: 13px;
      line-height: 1.4;
      margin: 0;
    }
    .code-container {
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Safari SVG Preview</h1>

    <div class="preview-section">
      <h2>SVG as Image Tag</h2>
      <img src="./preview.svg" class="preview-image">
    </div>

    <div class="preview-section">
      <h2>SVG Code</h2>
      <div class="code-container">
        <pre>${svgString
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")}</pre>
      </div>
    </div>
  </div>
</body>
</html>`;

      // Send both HTML and raw SVG bytes to the UI
      figma.ui.postMessage({
        type: "create-preview",
        html: htmlContent,
        svg: Array.from(svgBytes), // Convert Uint8Array to regular array
      });

      // Clean up the temporary frame
      tempFrame.remove();
    } catch (error) {
      console.error("Error generating preview:", error);
      figma.notify(`Error: ${error.message}`);
    }
  }

  if (msg.type === "cancel") {
    figma.closePlugin();
  }

  if (msg.type === "notify") {
    figma.notify(msg.message);
  }
};

// Recursively process a node and its children for image compression
async function processNodeHierarchy(node) {
  let fixedCount = 0;

  // First, check if the node itself has effects
  if (node.type === "FRAME") {
    // Remove autolayout from this frame
    if (node.layoutMode && node.layoutMode !== "NONE") {
      node.layoutMode = "NONE";
      console.log(`Removed autolayout from ${node.name}`);
    }

    // Process effects if present
    if (node.effects && node.effects.length > 0) {
      await fixFrameEffects(node);
      fixedCount++;
    }
  }

  // Then process all children recursively
  if ("children" in node) {
    for (const child of node.children) {
      fixedCount += await processNodeHierarchy(child);
    }
  }

  return fixedCount;
}

// Fix effects for a specific frame
async function fixFrameEffects(frame) {
  console.log(`-> fixFrameEffects for: ${frame.name} (${frame.id})`);

  // Load fonts if the frame contains text
  await loadFontsForNode(frame);

  // Store the original effects and fills
  const originalEffects = [...frame.effects];
  const originalFills = [...frame.fills];

  if (originalEffects.length === 0) {
    console.log(`   Skipping ${frame.name} - No effects found`);
    return;
  }

  try {
    // Create a rectangle with the same size as the frame
    const rect = figma.createRectangle();
    rect.resize(frame.width, frame.height);
    rect.x = frame.x;
    rect.y = frame.y;
    rect.name = `${frame.name} Effects`;

    // Apply corner radius
    if (
      "cornerRadius" in frame &&
      typeof frame.cornerRadius === "number" &&
      frame.cornerRadius !== 0
    ) {
      rect.cornerRadius = frame.cornerRadius;
    } else if ("topLeftRadius" in frame) {
      rect.topLeftRadius = frame.topLeftRadius;
      rect.topRightRadius = frame.topRightRadius;
      rect.bottomLeftRadius = frame.bottomLeftRadius;
      rect.bottomRightRadius = frame.bottomRightRadius;
    }

    // Copy the original fills (for correct opacity/color)
    if (originalFills.length > 0) {
      rect.fills = [...originalFills];
    } else {
      // If no fills, use a transparent one
      rect.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 }, opacity: 0 }];
    }

    // Copy effects to the rectangle
    rect.effects = originalEffects;

    // Insert the rectangle at the same level as the frame, just before it
    const parent = frame.parent;
    const index = parent.children.indexOf(frame);
    parent.insertChild(index, rect);

    // Remove effects and fills from the original frame
    frame.effects = [];
    frame.fills = [];

    console.log(`   Created effects rectangle for ${frame.name}`);
  } catch (e) {
    console.error(`   Error processing ${frame.name}:`, e);
    return;
  }
}

// Helper function to load fonts for text nodes
async function loadFontsForNode(node) {
  if (node.type === "TEXT") {
    await figma.loadFontAsync(node.fontName);
  } else if ("children" in node) {
    for (const child of node.children) {
      await loadFontsForNode(child);
    }
  }
}

// Process a node and all its children recursively for image compression
async function compressImagesInNode(node) {
  let compressedCount = 0;

  try {
    // Check if this node has image fills that can be compressed
    if (node.fills) {
      // Look for image fills
      const hasImageFill = node.fills.some((fill) => fill.type === "IMAGE");
      if (hasImageFill) {
        const didCompress = await compressNodeImages(node);
        if (didCompress) compressedCount++;
      }
    }

    // Process children recursively
    if ("children" in node) {
      for (const child of node.children) {
        compressedCount += await compressImagesInNode(child);
      }
    }
  } catch (e) {
    console.error(`Error processing node ${node.name}:`, e);
  }

  return compressedCount;
}

// Compress images in a node if needed
async function compressNodeImages(node) {
  if (!node.fills || node.fills.length === 0) return false;

  // Filter for image fills only
  const imageFills = node.fills.filter((fill) => fill.type === "IMAGE");
  if (imageFills.length === 0) return false;

  console.log(
    `Found ${imageFills.length} image fills in ${node.name} (${node.type})`
  );

  let processed = false;

  // Process each image fill
  for (let i = 0; i < node.fills.length; i++) {
    const fill = node.fills[i];
    if (fill.type !== "IMAGE") continue;

    try {
      // Get image data and size info
      let image = null;

      if (fill.imageHash) {
        try {
          image = await figma.getImageByHash(fill.imageHash);
        } catch (e) {
          console.log(`Couldn't get image by hash: ${e.message}`);
        }
      }

      if (!image && fill.imageRef) {
        try {
          image = await figma.getImageByReference(fill.imageRef);
        } catch (e) {
          console.log(`Couldn't get image by reference: ${e.message}`);
        }
      }

      if (!image) {
        console.log(`No valid image found for this fill in ${node.name}`);
        continue;
      }

      // Get image data
      const bytes = await image.getBytesAsync();
      const sizeKB = Math.round(bytes.length / 1024);
      const sizeMB = (bytes.length / (1024 * 1024)).toFixed(2);
      console.log(
        `Image in ${node.name} is ${bytes.length} bytes (${sizeKB}KB / ${sizeMB}MB)`
      );

      figma.notify(`Processing ${sizeKB}KB image... (this may take a moment)`, {
        timeout: 5000,
      });

      // Calculate the target dimensions (3x the container size)
      const targetWidth = Math.round(node.width * 3);
      const targetHeight = Math.round(node.height * 3);

      try {
        // Export the node as PNG at 3x scale
        await replaceWithExportedImage(node, i, targetWidth, targetHeight);
        processed = true;
      } catch (error) {
        console.error("Image processing failed:", error);
        figma.notify(`Failed to process image: ${error.message}`, {
          timeout: 5000,
        });
      }
    } catch (error) {
      console.error(`Error processing image in ${node.name}:`, error);
    }
  }

  return processed;
}

// Replace the image using export functionality
async function replaceWithExportedImage(
  node,
  fillIndex,
  targetWidth,
  targetHeight
) {
  try {
    // Clone the node to work with
    const clonedNode = node.clone();

    // Set export settings for a 3x PNG export
    clonedNode.exportSettings = [
      {
        format: "PNG",
        constraint: { type: "SCALE", value: 3 },
      },
    ];

    // Export the node as PNG bytes
    const exportBytes = await clonedNode.exportAsync({
      format: "PNG",
      constraint: { type: "SCALE", value: 3 },
    });

    // Get original image size for comparison
    let originalBytes = null;
    if (
      node.fills &&
      node.fills[fillIndex] &&
      node.fills[fillIndex].type === "IMAGE"
    ) {
      try {
        const fill = node.fills[fillIndex];
        const originalImage = fill.imageHash
          ? await figma.getImageByHash(fill.imageHash)
          : fill.imageRef
          ? await figma.getImageByReference(fill.imageRef)
          : null;

        if (originalImage) {
          originalBytes = await originalImage.getBytesAsync();
        }
      } catch (e) {
        console.log("Couldn't get original image bytes:", e);
      }
    }

    // Create a new image from the exported bytes
    const newImage = await figma.createImage(exportBytes);

    // Create an array of the node's fills to modify
    const newFills = [...node.fills];
    const currentFill = newFills[fillIndex];

    // Create a new fill with the exported image
    const newFill = Object.assign({}, currentFill);

    // Update the image reference in the fill
    if (currentFill.imageHash) {
      newFill.imageHash = newImage.hash;
    } else if (currentFill.imageRef) {
      newFill.imageRef = newImage.hash;
    }

    // Replace the fill in the array
    newFills[fillIndex] = newFill;

    // Update the node's fills with the new image
    node.fills = newFills;

    // Rename the node to indicate it's been compressed
    const originalName = node.name;
    node.name = `${originalName} (3x Compressed)`;

    // Clean up - remove the cloned node
    clonedNode.remove();

    // Get size of the new image for reporting
    const newBytes = await newImage.getBytesAsync();
    const originalSize = originalBytes ? originalBytes.length : 0;
    const newSize = newBytes.length;

    // Send the processed image data to the UI
    figma.ui.postMessage({
      type: "image-processed",
      name: originalName,
      originalSize: originalSize,
      newSize: newSize,
      dimensions: `${targetWidth}×${targetHeight}`,
    });

    // Also show a notification
    figma.notify(
      `Successfully replaced image with 3x export (${Math.round(
        newSize / 1024
      )}KB)`,
      { timeout: 3000 }
    );

    return true;
  } catch (error) {
    console.error("Error in replace with exported image:", error);
    throw error;
  }
}
