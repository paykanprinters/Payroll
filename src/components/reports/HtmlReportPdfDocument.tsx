"use client";

import React, { useMemo } from "react";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { MockCompanyDetails } from "@/lib/mock-data-interfaces";
import { resolveCompanyLogoSource, resolveDocumentLogoDimensions } from "@/lib/document-logo";
import { ReportDesignSettings } from "@/lib/report-design-interfaces";

type TextRun = { text: string; bold?: boolean };

type TableRow = { cells: { runs: TextRun[]; align: "left" | "right" }[]; isHeader?: boolean };

type Block =
  | { type: "heading"; level: 3 | 4; runs: TextRun[] }
  | { type: "paragraph"; runs: TextRun[] }
  | { type: "hr" }
  | { type: "table"; rows: TableRow[] };

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 11, color: "#111" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  logo: { objectFit: "contain" },
  companyInfo: { textAlign: "right" },
  title: { fontSize: 16, fontWeight: 700, textAlign: "center", marginBottom: 10 },
  h3: { fontSize: 13, fontWeight: 700, marginTop: 8, marginBottom: 6 },
  h4: { fontSize: 12, fontWeight: 700, marginTop: 8, marginBottom: 6 },
  p: { marginBottom: 6, lineHeight: 1.35 },
  hr: { height: 1, backgroundColor: "#e5e7eb", marginVertical: 10 },
  table: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 6, overflow: "hidden", marginVertical: 8 },
  tr: { flexDirection: "row" },
  th: { backgroundColor: "#f8fafc" },
  cell: { padding: 6, borderRightWidth: 1, borderRightColor: "#e5e7eb", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  cellLast: { borderRightWidth: 0 },
  textRight: { textAlign: "right" },
  textLeft: { textAlign: "left" },
  bold: { fontWeight: 700 },
});

const normalizeText = (s: string) => s.replace(/\s+/g, " ").trim();

const nodeRuns = (node: Node): TextRun[] => {
  if (node.nodeType === Node.TEXT_NODE) {
    const t = (node.textContent || "").replace(/\s+/g, " ");
    return t ? [{ text: t }] : [];
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return [];
  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();

  if (tag === "br") return [{ text: "\n" }];

  const isBold = tag === "strong" || tag === "b";
  const runs = Array.from(el.childNodes).flatMap(nodeRuns);
  if (!isBold) return runs;
  return runs.map((r) => ({ ...r, bold: true }));
};

const getAlignFromEl = (el: Element): "left" | "right" => {
  const cls = (el.getAttribute("class") || "").toLowerCase();
  const style = (el.getAttribute("style") || "").toLowerCase();
  if (cls.includes("text-right") || style.includes("text-align: right")) return "right";
  return "left";
};

const parseHtmlToBlocks = (html: string): Block[] => {
  if (typeof DOMParser === "undefined") {
    return [{ type: "paragraph", runs: [{ text: normalizeText(html) }] }];
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return [];

  const blocks: Block[] = [];

  const pushParagraphFromEl = (el: Element) => {
    const runs = Array.from(el.childNodes).flatMap(nodeRuns);
    const combined = runs.map((r) => r.text).join("");
    if (!normalizeText(combined)) return;
    blocks.push({ type: "paragraph", runs });
  };

  const walkTop = (el: Element) => {
    const tag = el.tagName.toLowerCase();

    if (tag === "h3" || tag === "h4") {
      const runs = Array.from(el.childNodes).flatMap(nodeRuns);
      blocks.push({ type: "heading", level: tag === "h3" ? 3 : 4, runs });
      return;
    }

    if (tag === "hr") {
      blocks.push({ type: "hr" });
      return;
    }

    if (tag === "table") {
      const rows: TableRow[] = [];
      const trs = Array.from(el.querySelectorAll("tr"));
      trs.forEach((tr) => {
        const isHeader =
          tr.closest("thead") != null ||
          Array.from(tr.children).some((c) => c.tagName.toLowerCase() === "th");
        const cells = Array.from(tr.children)
          .filter((c) => ["td", "th"].includes(c.tagName.toLowerCase()))
          .map((c) => ({
            runs: Array.from(c.childNodes).flatMap(nodeRuns),
            align: getAlignFromEl(c),
          }));
        if (cells.length > 0) rows.push({ cells, isHeader });
      });
      if (rows.length > 0) blocks.push({ type: "table", rows });
      return;
    }

    if (tag === "p") {
      pushParagraphFromEl(el);
      return;
    }

    // Common wrappers in generated content
    if (tag === "div" || tag === "section") {
      Array.from(el.children).forEach(walkTop);
      return;
    }

    // Fallback: treat as paragraph
    pushParagraphFromEl(el);
  };

  Array.from(root.children).forEach(walkTop);
  return blocks;
};

const RunsText: React.FC<{ runs: TextRun[]; style?: any }> = ({ runs, style }) => {
  return (
    <Text style={style}>
      {runs.map((r, idx) => (
        <Text key={idx} style={r.bold ? styles.bold : undefined}>
          {r.text}
        </Text>
      ))}
    </Text>
  );
};

type Props = {
  reportTitle: string;
  reportContentHtml: string;
  companyDetails: MockCompanyDetails | null;
  reportDesignSettings: ReportDesignSettings;
};

const HtmlReportPdfDocument: React.FC<Props> = ({
  reportTitle,
  reportContentHtml,
  companyDetails,
  reportDesignSettings,
}) => {
  const blocks = useMemo(() => parseHtmlToBlocks(reportContentHtml), [reportContentHtml]);

  const companyName =
    companyDetails?.companyLegalName || companyDetails?.companyTradingName || "Your Company Name";

  const logoSrc = reportDesignSettings.includeCompanyLogo
    ? resolveCompanyLogoSource(companyDetails?.logoUrl)
    : undefined;
  const logoDims = resolveDocumentLogoDimensions(
    companyDetails?.logoWidth,
    companyDetails?.logoHeight,
    companyDetails?.logoFit
  );

  const baseFontSize = reportDesignSettings.reportContentFontSize || 12;

  const pageSize =
    reportDesignSettings.defaultReportPaperSize === "Letter"
      ? ("LETTER" as const)
      : reportDesignSettings.defaultReportPaperSize;

  return (
    <Document>
      <Page size={pageSize} style={[styles.page, { fontSize: baseFontSize }]}>
        {(reportDesignSettings.includeCompanyDetails || logoSrc) && (
          <View style={styles.headerRow}>
            <View>
              {logoSrc && <Image src={logoSrc} style={[styles.logo, { width: logoDims.width, height: logoDims.height }]} />}
            </View>
            {reportDesignSettings.includeCompanyDetails && (
              <View style={styles.companyInfo}>
                <Text style={{ fontSize: 12, fontWeight: 700 }}>{companyName}</Text>
                {!!companyDetails?.physicalAddress && <Text>{companyDetails.physicalAddress}</Text>}
                {!!companyDetails?.companyRegistrationNumber && (
                  <Text>{`Reg. No: ${companyDetails.companyRegistrationNumber}`}</Text>
                )}
                {!!companyDetails?.vatRegistrationNumber && (
                  <Text>{`VAT No: ${companyDetails.vatRegistrationNumber}`}</Text>
                )}
                {!!companyDetails?.mainContactNumber && <Text>{`Tel: ${companyDetails.mainContactNumber}`}</Text>}
                {!!companyDetails?.companyEmail && <Text>{`Email: ${companyDetails.companyEmail}`}</Text>}
                {!!companyDetails?.companyWebsite && <Text>{`Web: ${companyDetails.companyWebsite}`}</Text>}
              </View>
            )}
          </View>
        )}

        <Text style={styles.title}>{reportTitle}</Text>

        {blocks.map((b, i) => {
          if (b.type === "hr") return <View key={i} style={styles.hr} />;

          if (b.type === "heading") {
            return (
              <RunsText
                key={i}
                runs={b.runs}
                style={b.level === 3 ? styles.h3 : styles.h4}
              />
            );
          }

          if (b.type === "paragraph") {
            return <RunsText key={i} runs={b.runs} style={styles.p} />;
          }

          if (b.type === "table") {
            const colCount = Math.max(...b.rows.map((r) => r.cells.length));
            return (
              <View key={i} style={styles.table}>
                {b.rows.map((r, rIdx) => (
                  <View key={rIdx} style={[styles.tr, r.isHeader ? styles.th : undefined]}>
                    {Array.from({ length: colCount }).map((_, cIdx) => {
                      const cell = r.cells[cIdx];
                      const isLast = cIdx === colCount - 1;
                      return (
                        <View
                          key={cIdx}
                          style={[
                            styles.cell,
                            isLast ? styles.cellLast : undefined,
                            { flex: 1 },
                            rIdx === b.rows.length - 1 ? { borderBottomWidth: 0 } : undefined,
                          ]}
                        >
                          {cell ? (
                            <RunsText
                              runs={cell.runs}
                              style={[
                                cell.align === "right" ? styles.textRight : styles.textLeft,
                                r.isHeader ? styles.bold : undefined,
                              ]}
                            />
                          ) : (
                            <Text> </Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
            );
          }

          return null;
        })}
      </Page>
    </Document>
  );
};

export default HtmlReportPdfDocument;