use ingest::{
    chunk_document, content_hash, estimate_tokens, parser_for, run_pipeline, MarkdownParser,
    ParsedDocument, ParsedSection, ParsedTopic, Parser, TxtParser,
};
use std::io::{Cursor, Write};
use zip::write::SimpleFileOptions;
use zip::ZipWriter;

#[test]
fn txt_parser_reads_fixture() {
    let bytes = std::fs::read("tests/fixtures/sample.txt").expect("fixture");
    let doc = TxtParser.parse(&bytes, "sample.txt").expect("parse");
    assert!(!doc.topics.is_empty());
    assert!(!doc.topics[0].sections[0].text.is_empty());
}

#[test]
fn markdown_parser_builds_topic_tree() {
    let bytes = std::fs::read("tests/fixtures/sample.md").expect("fixture");
    let doc = MarkdownParser.parse(&bytes, "sample.md").expect("parse");
    assert!(doc.topics.len() >= 2);
}

#[test]
fn content_hash_stable() {
    let a = content_hash(b"hello");
    let b = content_hash(b"hello");
    assert_eq!(a, b);
    assert_ne!(content_hash(b"hello"), content_hash(b"world"));
}

#[test]
fn chunker_respects_sentence_boundaries() {
    let sentence = "Alpha beta gamma. Delta epsilon zeta. Eta theta iota. ";
    let text = sentence.repeat(40);
    let doc = ParsedDocument {
        title: "Doc".into(),
        topics: vec![ParsedTopic {
            title: "T".into(),
            parent_index: None,
            sections: vec![ParsedSection {
                text,
                page_ref: None,
            }],
        }],
    };
    let chunks = chunk_document(&doc, 40, 5);
    assert!(chunks.len() > 1);
    for chunk in &chunks {
        assert!(estimate_tokens(&chunk.text) <= 60);
        assert!(
            chunk.text.ends_with('.')
                || chunk.text.ends_with('!')
                || chunk.text.ends_with('?')
                || chunk.text.len() < 20,
            "mid-sentence split: {}",
            chunk.text
        );
    }
}

#[test]
fn pipeline_runs_on_markdown() {
    let bytes = std::fs::read("tests/fixtures/sample.md").expect("fixture");
    let result = run_pipeline(&bytes, "sample.md").expect("pipeline");
    assert!(!result.topics.is_empty());
    assert!(!result.chunks.is_empty());
}

#[test]
fn unsupported_extension() {
    assert!(parser_for("file.docx").is_none());
}

#[test]
fn epub_parser_maps_toc_and_strips_html() {
    let bytes = build_minimal_epub();
    let parser = parser_for("book.epub").expect("epub parser");
    let doc = parser.parse(&bytes, "book.epub").expect("parse epub");
    assert!(doc.topics.iter().any(|t| t.title == "Chapter One"));
    let body = doc
        .topics
        .iter()
        .flat_map(|t| &t.sections)
        .map(|s| s.text.as_str())
        .collect::<Vec<_>>()
        .join(" ");
    assert!(body.contains("Epub body text"));
}

#[test]
fn pdf_fixture_or_no_text_error() {
    let bytes = std::fs::read("tests/fixtures/sample.pdf").unwrap_or_else(|_| {
        // Minimal PDF with a text stream (Type1 Helvetica).
        br#"%PDF-1.1
1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj
2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj
3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj
4 0 obj<< /Length 44 >>stream
BT /F1 24 Tf 100 100 Td (Hello PDF) Tj ET
endstream
endobj
5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000262 00000 n 
0000000355 00000 n 
trailer<< /Size 6 /Root 1 0 R >>
startxref
433
%%EOF"#.to_vec()
    });
    let parser = parser_for("sample.pdf").expect("pdf parser");
    match parser.parse(&bytes, "sample.pdf") {
        Ok(doc) => assert!(!doc.topics.is_empty()),
        Err(err) => {
            let message = err.to_string();
            assert!(
                message.to_lowercase().contains("text") || message.to_lowercase().contains("pdf"),
                "{message}"
            );
        }
    }
}

fn build_minimal_epub() -> Vec<u8> {
    let buf = Cursor::new(Vec::new());
    let mut zip = ZipWriter::new(buf);
    let opts = SimpleFileOptions::default().compression_method(zip::CompressionMethod::Stored);

    zip.start_file("mimetype", opts).unwrap();
    zip.write_all(b"application/epub+zip").unwrap();

    zip.start_file("META-INF/container.xml", opts).unwrap();
    zip.write_all(
        br#"<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>"#,
    )
    .unwrap();

    zip.start_file("OEBPS/content.opf", opts).unwrap();
    zip.write_all(
        br#"<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Fixture Book</dc:title>
    <dc:identifier id="uid">fixture-epub-1</dc:identifier>
    <dc:language>en</dc:language>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="c1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine toc="ncx">
    <itemref idref="c1"/>
  </spine>
</package>"#,
    )
    .unwrap();

    zip.start_file("OEBPS/toc.ncx", opts).unwrap();
    zip.write_all(
        br#"<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head><meta name="dtb:uid" content="fixture-epub-1"/></head>
  <docTitle><text>Fixture Book</text></docTitle>
  <navMap>
    <navPoint id="np1" playOrder="1">
      <navLabel><text>Chapter One</text></navLabel>
      <content src="chapter1.xhtml"/>
    </navPoint>
  </navMap>
</ncx>"#,
    )
    .unwrap();

    zip.start_file("OEBPS/chapter1.xhtml", opts).unwrap();
    zip.write_all(
        br#"<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml"><body><p>Epub body text for tests.</p></body></html>"#,
    )
    .unwrap();

    let finished = zip.finish().unwrap();
    finished.into_inner()
}
