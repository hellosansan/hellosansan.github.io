import { visit } from 'unist-util-visit';

/**
 * Converts a number (1-99) to its Chinese numeral representation.
 * @param {number} num - The integer to convert, must be between 1 and 99.
 * @returns {string} The Chinese numeral string.
 * @throws {Error} If the input number is not an integer or is outside the valid range.
 */
function numberToChinese(num) {
  // Parameter validation
  if (!Number.isInteger(num) || num < 1 || num > 99) {
    throw new Error(`Please input an integer between 1-99: ${num}`);
  }

  // Basic numeral mapping
  const digits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

  // Return directly for single digits
  if (num < 10) {
    return digits[num];
  }

  // Handle double digits
  const tens = Math.floor(num / 10);
  const ones = num % 10;

  let result = '';

  // Process tens place
  if (tens === 1) {
    result = '十';
  } else {
    result = digits[tens] + '十';
  }

  // Process ones place
  if (ones !== 0) {
    result += digits[ones];
  }

  return result;
}

/**
 * Applies a regular expression pattern to the value of text and HTML nodes within an AST node's children,
 * replacing matches with a specified template string. This function ensures that both text and HTML
 * content are processed to prevent missing potential matches.
 * @param {object} node - The AST node whose children will be processed.
 * @param {RegExp} regex - The regular expression pattern to search for.
 * @param {string} template - The template string used for replacement. Can include capture group references like `$1`.
 * @returns {Array<object>} A new array of node children with replacements applied. Nodes that do not match
 *   the criteria or are not of 'text' or 'html' type are passed through unchanged.
 */
function regex(node, regex, template) {
  const newChildren = [];

  for (const child of node.children) {
    // Process both html and text nodes to avoid missing matches
    if (child.type !== 'text' && child.type !== 'html' && child.type !== 'blockquote') {
      newChildren.push(child);
      continue;
    }

    if (child.value.replace(regex, template) === child.value) {
      if (child.type === "html") {
        newChildren.push(child)
      } else {
        newChildren.push({
          type: "text",
          value: child.value
        })
      }
    } else {
      newChildren.push({
        type: "html",
        value: child.value.replace(regex, template)
      })
    }
  }

  return newChildren;
}

/**
 * Processes image nodes within an AST, wrapping them in a `<figure>` element with a `<figcaption>`.
 * This function assigns a unique Chinese numeral to each image and applies a floating class
 * (`float-right` for odd-numbered images, `float-left` for even-numbered images) for styling.
 * It also adjusts relative image URLs to point to the `/attachments/` directory.
 * @param {object} node - The AST node containing image children to process.
 * @returns {Array<object>} A new array of node children with image nodes replaced by `<figure>` HTML nodes.
 */
function imgRegex(node) {
  const newChildren = [];

  if (typeof imgRegex.imgNum === 'undefined') {
    imgRegex.imgNum = 0;
  }

  for (const child of node.children) {
    if (child.type !== 'image') {
      newChildren.push(child);
      continue;
    }

    imgRegex.imgNum++;
    const imgNum = imgRegex.imgNum;
    const chineseNum = numberToChinese(imgNum);

    // Determine the float direction based on image number (odd: right, even: left)
    const floatClass = imgNum % 2 !== 0 ? 'float-right' : 'float-left';

    // Sanitize alt text to prevent issues with quotes in the HTML attribute
    const altText = child.alt ? child.alt.replace(/"/g, '&quot;') : '';

    // Create the full <figure> element as an HTML string with the correct float class
    let imageUrl = child.url;
    // Check if the image URL is a relative path that should point to attachments
    // This covers cases like 'attachments/test.png' or 'some/path/attachments/test.png'
    const attachmentsIndex = imageUrl.indexOf('attachments/');
    if (attachmentsIndex !== -1) {
      // Extract the part after 'attachments/'
      const relativePathAfterAttachments = imageUrl.substring(attachmentsIndex + 'attachments/'.length);
      imageUrl = `/attachments/${relativePathAfterAttachments}`;
    }

    const figureHtml = `
<figure class="image-wrap ${floatClass}">
  <img src="${imageUrl}" alt="${altText}">
  <figcaption>
    <a href="#img_forward_link_图${chineseNum}" id="img_backward_link_图${chineseNum}">图${chineseNum}</a>：${child.alt}
  </figcaption>
</figure>`;

    // Push the new <figure> as a single HTML node, replacing the original image node
    newChildren.push({
      type: "html",
      value: figureHtml
    });
  }

  return newChildren;
}

/**
 * Processes table nodes within an AST, adding a numbered caption above each table.
 * The caption includes a Chinese numeral representation of the table number and its title,
 * extracted from the first cell of the first row of the table.
 * @param {object} node - The AST node containing table children to process.
 * @returns {Array<object>} A new array of node children with HTML nodes for table captions inserted.
 */
function tblRegex(node) {
  const newChildren = [];
  let isInTbl = false;
  let isFirstRow = true;
  let currentTblTitle = "";

  if (typeof tblRegex.tblNum === 'undefined') {
    tblRegex.tblNum = 0;
  }

  for (const child of node.children) {
    if (child.type !== 'tableRow') {
      if (isInTbl === true) {
        tblRegex.tblNum = tblRegex.tblNum + 1;
        newChildren.push({
          type: "html",
          value: `<p class="tbl_title"><a href="#tbl_forward_link_表${numberToChinese(tblRegex.tblNum)}" id="tbl_backward_link_表${numberToChinese(tblRegex.tblNum)}">表${numberToChinese(tblRegex.tblNum)}</a>：${currentTblTitle}</p>`
        });
        isInTbl = false;
      }
      newChildren.push(child);
      continue;
    }

    isInTbl = true;

    if (isFirstRow && child.children && child.children[0]) {
      const firstCell = child.children[0];
      if (firstCell.children && firstCell.children[0]) {
        currentTblTitle = firstCell.children[0].value || "";
        firstCell.children[0].value = "";
      }
      isFirstRow = false;
    }

    newChildren.push(child);
  }

  if (isInTbl === true) {
    tblRegex.tblNum = tblRegex.tblNum + 1;
    newChildren.push({
      type: "html",
      value: `<p class="tbl_title"><a href="#tbl_forward_link_表${numberToChinese(tblRegex.tblNum)}" id="tbl_backward_link_表${numberToChinese(tblRegex.tblNum)}">表${numberToChinese(tblRegex.tblNum)}</a>：${currentTblTitle}</p>`
    });
  }

  return newChildren;
}

// Global storage for footnotes
let collectedFootnotes = [];

/**
 * Processes standard footnote references `[^content]` within text and HTML nodes.
 * It extracts the footnote content, assigns a unique number, stores it globally,
 * and replaces the reference with an HTML link to the footnote section.
 * @param {object} node - The AST node containing children to process.
 * @returns {Array<object>} A new array of node children with footnote references replaced by HTML links.
 */
function footnoteRegex(node) {
  if (typeof footnoteRegex.footNoteNum === 'undefined') {
    footnoteRegex.footNoteNum = 0;
  }

  const newChildren = [];
  const footnoteCaptureRegex = /(\[\^(?!表|图)([^\]]*?)\])/g;

  for (const child of node.children) {
    if (child.type !== 'text' && child.type !== 'html') {
      newChildren.push(child);
      continue;
    }

    const text = child.value || '';
    const parts = text.split(footnoteCaptureRegex);

    if (parts.length === 1) {
      newChildren.push(child);
      continue;
    }

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) continue;

      // Even parts are plain text, odd parts are the captured footnote content
      if (i % 3 === 0) {
        if (part) newChildren.push({ type: 'text', value: part });
      } else if (i % 3 === 1) {
        const footnoteContent = parts[i + 1];
        footnoteRegex.footNoteNum++;
        const footnoteNum = footnoteRegex.footNoteNum;

        // Store footnote for later insertion at the end of the document
        collectedFootnotes.push({
          num: footnoteNum,
          content: footnoteContent
        });

        // Create the reference link
        const reference = `<a class="comment_forward_link" href="#comment_backward_link_${footnoteNum}" id="comment_forward_link_${footnoteNum}">[${footnoteNum}]</a>`;
        newChildren.push({ type: 'html', value: reference });
        i++; // Also skip the next part as it's the content
      }
    }
  }

  return newChildren;
}

/**
 * Transforms a specific custom footnote format `^[desc](link)]` into the standard `[^desc]` format.
 * This function directly manipulates the AST nodes, identifying the pattern across multiple child nodes
 * (text, link, text) and consolidating them into a single text node with the standard footnote syntax.
 * It also merges adjacent text nodes for a cleaner Abstract Syntax Tree (AST).
 * @param {object} node - The parent AST node (e.g., a paragraph) containing the children to process.
 * @returns {Array<object>} A new array of children with the custom footnote transformations applied.
 */
function transformCustomFootnotes(node) {
  let children = [...node.children]; // Make a mutable copy to process
  const newChildren = [];

  while (children.length > 0) {
    const child1 = children[0];
    const child2 = children[1];
    const child3 = children[2];

    // Check for the pattern: text node ending with `^[`, followed by a link node, followed by a text node starting with `]`
    if (
      child1 && child1.type === 'text' && child1.value.endsWith('^[') &&
      child2 && child2.type === 'link' && child2.children && child2.children.length > 0 &&
      child3 && child3.type === 'text' && child3.value.startsWith(']')
    ) {
      const linkText = child2.children[0].value || '';

      // Push the processed part: text before the marker + the new footnote reference
      newChildren.push({
        type: 'text',
        value: child1.value.slice(0, -2) + `[^${linkText}]`
      });

      // The rest of the third child becomes the new text to process
      const remainingText = child3.value.slice(1);
      const remainingChildren = children.slice(3);

      if (remainingText) {
        // Prepend the remaining text to the rest of the children for the next loop iteration
        children = [{ type: 'text', value: remainingText }, ...remainingChildren];
      } else {
        children = remainingChildren;
      }
    } else {
      // If no match, move the first child to the result and continue with the rest
      newChildren.push(child1);
      children.shift();
    }
  }

  // Merge adjacent text nodes for a cleaner AST
  if (newChildren.length < 2) {
    return newChildren;
  }

  const mergedChildren = [newChildren[0]];
  for (let i = 1; i < newChildren.length; i++) {
    const lastNode = mergedChildren[mergedChildren.length - 1];
    const currentNode = newChildren[i];
    if (lastNode.type === 'text' && currentNode.type === 'text') {
      lastNode.value += currentNode.value; // Merge
    } else {
      mergedChildren.push(currentNode);
    }
  }

  return mergedChildren;
}


/**
 * A Remark plugin that processes and transforms various Markdown elements into custom HTML structures.
 * This plugin handles: Chinese numeral conversion for images and tables, custom internal links,
 * standard footnote processing, and applies specific styling for Chinese typography.
 * It initializes counters for images, tables, and footnotes, and collects footnote content globally.
 * @returns {Function} A transformer function that takes an AST (Abstract Syntax Tree) and modifies it.
 */
export default function markdownReplace() {
  return (tree) => {
    imgRegex.imgNum = 0;
    tblRegex.tblNum = 0;
    footnoteRegex.footNoteNum = 0;
    collectedFootnotes = [];
    visit(tree, ['paragraph', 'table', 'tableCell'], (node) => {
      if (!node.children) return;

      // Decode URI-encoded spaces (%20) in text nodes to prevent build errors.
      // This allows subsequent regexes to match correctly.
      for (const child of node.children) {
        if ((child.type === 'text' || child.type === 'html') && child.value) {
          child.value = child.value.replace(/%20/g, ' ');
        }
      }

      // First, transform the custom footnote format `^[desc](link)]` into `[^desc]`
      node.children = transformCustomFootnotes(node);

      // Handle [[#anchor|description]] links (internal page anchors)
      node.children = regex(node, /\[\[(#.*?)\|(.*?)\]\]/g, '<a href="$1">$2</a>');
      // Handle [[#anchor]] links (internal page anchors)
      node.children = regex(node, /\[\[(#.*?)\]\]/g, '<a href="$1">$1</a>');
      // Handle [[post-title|description]] links (internal blog posts)
      node.children = regex(node, /\[\[(?!#)(.*?)\|(.*?)\]\]/g, '<a href="/post/$1">$2</a>');
      // Handle [[post-title]] links (internal blog posts)
      node.children = regex(node, /\[\[(?!#)(.*?)\]\]/g, '<a href="/post/$1">$1</a>');

      // Now, process the standard footnotes, including the ones we just created
      node.children = footnoteRegex(node);

      node.children = imgRegex(node);
      node.children = regex(node, /\[\^(图.*?)\]/g, '<a href="#img_backward_link_$1" id="img_forward_link_$1">$1</a>');

      node.children = tblRegex(node);
      node.children = regex(node, /\[\^(表.*?)\]/g, '<a href="#tbl_backward_link_$1" id="tbl_forward_link_$1">$1</a>');

      // Add italic formatting for text within Chinese angle brackets 「」
      node.children = regex(node, /「([^」]*?)」/g, '「<em>$1</em>」');

      // Add bold formatting for text within Chinese double quotes ""
      // node.children = regex(node, /“([^”]*?)”/g, '“<strong>$1</strong>”');

      // Add space between Chinese and English/numbers
      node.children = regex(node, /([\u4e00-\u9fa5])([a-zA-Z0-9])/g, '$1 $2');
      node.children = regex(node, /([a-zA-Z0-9])([\u4e00-\u9fa5])/g, '$1 $2');

      // TODO: 中文 + 标点
      node.children = regex(node, /(\u4e00-\u9fa5)\s+([\u4e00-\u9fa5])/g, '$1$2');
      node.children = regex(node, /(\u4e00-\u9fa5)\s+([\u4e00-\u9fa5])/g, '$1$2');
      node.children = regex(node, /(\u4e00-\u9fa5)\s+([\u4e00-\u9fa5])/g, '$1$2');

      node.children = regex(node, /(『\s*|\s*』)/g, '<span style="display: none;">$1</span>');

      node.children = regex(node, /—(——.*)/g, '<p style="text-align: right; text-indent: 0; padding: 0 2px 0 0;">$1</p>');

      node.children = regex(node, /^\.Right{(.*)}/g, ' <p style="text-align: right;  text-indent: 0;">$1</p>');
      node.children = regex(node, /^\.Center{(.*)}/g, '<p style="text-align: center; text-indent: 0;">$1</p>');
      node.children = regex(node, /^\.Left{(.*)}/g, '  <p style="text-align: left;   text-indent: 0;">$1</p>');

      node.children = regex(node, /^\.right{(.*)}/g, ' <p style="font-style: italic; text-align: right;  text-indent: 0;">$1</p>');
      node.children = regex(node, /^\.center{(.*)}/g, '<p style="font-style: italic; text-align: center; text-indent: 0;">$1</p>');
      node.children = regex(node, /^\.left{(.*)}/g, '  <p style="font-style: italic; text-align: left;   text-indent: 0;">$1</p>');
    });

    // 在正文末尾追加字符
    if (tree.children.length > 0) {
      // 从后往前寻找最后一个段落节点
      let lastParagraph = null;
      for (let i = tree.children.length - 1; i >= 0; i--) {
        const node = tree.children[i];
        if (node.type === 'paragraph' && node.children && node.children.length > 0) {
          lastParagraph = node;
          break;
        }
      }

      if (lastParagraph) {
        // 获取段落的最后一个子节点（通常是 text 或 html 节点）
        const lastNodeInParagraph = lastParagraph.children[lastParagraph.children.length - 1];

        // 确保该节点有 value 属性可以修改
        if (lastNodeInParagraph && (lastNodeInParagraph.type === 'text' || lastNodeInParagraph.type === 'html') && typeof lastNodeInParagraph.value === 'string') {
          lastNodeInParagraph.value += '¶';
        }
      }
    }

    // Add footnotes section at the end if we have any footnotes
    if (collectedFootnotes.length > 0) {
      // Add a divider
      tree.children.push({
        type: "html",
        value: "<hr style='margin: 1.5em 0 1.5em 0;' class='footnote-separator'>"
      });

      // Add a heading for footnotes
      // tree.children.push({
      //     type: "html",
      //     value: "<h3 class='footnotes-title'>脚注</h3>"
      // });

      // Add all footnotes
      for (const footnote of collectedFootnotes) {
        tree.children.push({
          type: "html",
          value: `<table class="comment"><tr class="comment"><td class="comment"><a href="#comment_forward_link_${footnote.num}" id="comment_backward_link_${footnote.num}">[${footnote.num}]</a></td><td class="comment">${footnote.content}</td></tr></table>`
        });
      }
    }
  };
}
