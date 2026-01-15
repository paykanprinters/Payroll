"use client";

export type PaymentItem = {
  employeeId: string;
  accountHolder?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  branchCode?: string | null;
  amount: number;
};

const sanitize = (s: string | null | undefined) => (s || "").toString().trim();

export const generateEftCsv = (items: PaymentItem[]) => {
  const headers = ["account_number","branch_code","amount","account_holder","employee_id"];
  const lines = [headers.join(",")];
  let totalAmount = 0;
  items.forEach(it => {
    totalAmount += Number(it.amount || 0);
    const line = [
      sanitize(it.accountNumber).replace(/,/g, ""),
      sanitize(it.branchCode).replace(/,/g, ""),
      Number(it.amount).toFixed(2),
      `"${sanitize(it.accountHolder).replace(/"/g, '""')}"`,
      sanitize(it.employeeId)
    ].join(",");
    lines.push(line);
  });
  // Append a simple control totals row
  lines.push(["TOTALS","","", Number(totalAmount).toFixed(2), items.length].join(","));
  return lines.join("\n");
};

// Simplified NACHA/ACH (not production-grade). Uses branchCode as routing.
// Records: 1 (File Header), 5 (Batch Header), 6 (Entry), 8 (Batch Control), 9 (File Control)
export const generateNachaAch = (items: PaymentItem[], originCompany: string = "COMPANY", originId: string = "000000000") => {
  const pad = (s: string, len: number, ch: string = " ", dir: "left" | "right" = "right") => {
    const str = s.slice(0, len);
    if (str.length >= len) return str;
    const p = ch.repeat(len - str.length);
    return dir === "right" ? str + p : p + str;
  };

  const now = new Date();
  const date = `${now.getFullYear().toString().slice(-2)}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}`;
  const time = `${String(now.getHours()).padStart(2,"0")}${String(now.getMinutes()).padStart(2,"0")}`;

  let batchHash = 0;
  let totalAmount = 0;
  let entryCount = 0;

  const lines: string[] = [];
  // File Header (type 1)
  lines.push(
    [
      "1",
      "01", // priority code
      pad("000000000",10), // immediate destination (routing)
      pad(originId,10),    // immediate origin
      date, time,
      "A",                 // file id modifier
      "094",               // record size
      "10",                // blocking factor
      "1",                 // format code
      pad("",23),          // reserved
      pad(originCompany,8) // destination name (short)
    ].join("")
  );

  // Batch Header (type 5)
  lines.push(
    [
      "5",
      "200",                           // service class code (credits)
      pad(originCompany,16),
      pad("PAYROLL",20),               // company discretionary
      pad(originId,10),                // company id
      "PPD",                           // standard entry class
      pad("NET PAY",10),               // entry description
      date,                            // date
      pad("",3),                       // julian date
      pad("",8),                       // reserved
      pad("000000000",8),              // originating DFI id
      pad("0001",7)                    // batch number
    ].join("")
  );

  // Entries (type 6)
  items.forEach((it, idx) => {
    const routing = sanitize(it.branchCode).padStart(9,"0").slice(0,9);
    const account = sanitize(it.accountNumber);
    const cents = Math.round(Number(it.amount) * 100);
    batchHash += Number(routing.slice(0,8));
    totalAmount += cents;
    entryCount += 1;

    lines.push(
      [
        "6",
        "27",                     // transaction code (checking credit)
        routing,                  // receiving DFI id + check digit
        pad(account,17),
        pad(String(cents),10,"0","left"),
        pad(sanitize(it.accountHolder),22),
        pad(it.employeeId,15),
        pad("",8),
        pad("000000000",8)
      ].join("")
    );
  });

  // Batch Control (type 8)
  lines.push(
    [
      "8",
      "200",
      pad(String(entryCount),6,"0","left"),
      pad(String(batchHash % 99999999),10,"0","left"),
      pad(String(totalAmount),12,"0","left"),
      pad("",24),
      pad("000000000",8),
      pad("0001",7)
    ].join("")
  );

  // File Control (type 9)
  lines.push(
    [
      "9",
      pad("1",6,"0","left"),         // batch count
      pad(String(entryCount),6,"0","left"),
      pad(String(batchHash % 99999999),10,"0","left"),
      pad(String(totalAmount),12,"0","left"),
      pad("",39)
    ].join("")
  );

  return lines.join("\n");
};

// Simplified SEPA pain.001 XML (not production-grade), for preview/testing.
export const generateSepaXml = (items: PaymentItem[], debtorName: string = "Company Ltd", debtorIban: string = "XX00TEST0000000000") => {
  const totalAmt = items.reduce((s, it) => s + Number(it.amount || 0), 0);
  const now = new Date().toISOString();

  const xmlParts: string[] = [];
  xmlParts.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  xmlParts.push(`<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03">`);
  xmlParts.push(`<CstmrCdtTrfInitn>`);
  xmlParts.push(`<GrpHdr><MsgId>${now}</MsgId><CreDtTm>${now}</CreDtTm><NbOfTxs>${items.length}</NbOfTxs><CtrlSum>${totalAmt.toFixed(2)}</CtrlSum><InitgPty><Nm>${debtorName}</Nm></InitgPty></GrpHdr>`);
  xmlParts.push(`<PmtInf><PmtInfId>${now}</PmtInfId><PmtMtd>TRF</PmtMtd><BtchBookg>true</BtchBookg><NbOfTxs>${items.length}</NbOfTxs><CtrlSum>${totalAmt.toFixed(2)}</CtrlSum>`);
  xmlParts.push(`<Dbtr><Nm>${debtorName}</Nm></Dbtr><DbtrAcct><Id><IBAN>${debtorIban}</IBAN></Id></DbtrAcct>`);
  xmlParts.push(`<DbtrAgt><FinInstnId><BIC>TESTBIC0XXX</BIC></FinInstnId></DbtrAgt>`);
  xmlParts.push(`<ChrgBr>SLEV</ChrgBr>`);

  items.forEach((it, idx) => {
    const nm = sanitize(it.accountHolder);
    const amt = Number(it.amount || 0).toFixed(2);
    const iban = sanitize(it.accountNumber);
    xmlParts.push(`<CdtTrfTxInf><PmtId><EndToEndId>${nm || "UNKNOWN"}-${idx+1}</EndToEndId></PmtId><Amt><InstdAmt Ccy="EUR">${amt}</InstdAmt></Amt><CdtrAgt><FinInstnId><BIC>TESTBIC0XXX</BIC></FinInstnId></CdtrAgt><Cdtr><Nm>${nm}</Nm></Cdtr><CdtrAcct><Id><IBAN>${iban}</IBAN></Id></CdtrAcct></CdtTrfTxInf>`);
  });

  xmlParts.push(`</PmtInf></CstmrCdtTrfInitn></Document>`);
  return xmlParts.join("");
};