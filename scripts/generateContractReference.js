/**
 * Generate Ohana Protocol Contract Address Reference (Word document)
 * Run: node scripts/generateContractReference.js
 */
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, HeadingLevel } = require("docx");
const fs = require("fs");
const path = require("path");

const LUKSO = {
  chainId: 4201,
  name: "LUKSO Testnet",
  rpc: "https://rpc.testnet.lukso.network",
  POAPForge: "0xa5Bc1D8D894d63b1c34d9b26F5F5ef32a152e7D4",
  Handshake: "0x469C39f862856D6D4620A2a23eA12C4D2C78B549",
  ReputationStation: "0x1F8fD5b4a83CB682a4C73b4dda9c2f73dA239468",
  LSP17VouchExtension: "0x2ed6c1F09d50FE07cE2CA36Bd22e766C04059424",
};

const BASE_SEPOLIA = {
  chainId: 84532,
  name: "Base Sepolia",
  rpc: "https://sepolia.base.org",
  POAPForge: "0x93472DF4C6A0d86bFE1776a48D297bE75fcd0acA",
  Handshake: "0x4fcC091A73a72E4ed24369c272a8c348e74D6FCD",
  ReputationStation: "0x96aDfFc0f03Ea4248Fa7Dc79A31b018Ef8C90288",
  LSP17VouchExtension: "0xd2f338973760D20290cfB8ae093F2e5a395c9ea4",
};

function tableRow(cells) {
  return new TableRow({
    children: cells.map((text) =>
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text })] })],
      })
    ),
  });
}

const doc = new Document({
  sections: [
    {
      children: [
        new Paragraph({
          text: "Ohana Protocol — Contract Addresses & Setup Reference",
          heading: HeadingLevel.TITLE,
          spacing: { after: 400 },
        }),
        new Paragraph({
          text: `Generated: ${new Date().toISOString().split("T")[0]}`,
          spacing: { after: 600 },
        }),

        new Paragraph({ text: "1. Deployed Contract Addresses", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),

        new Paragraph({ text: "LUKSO Testnet (Chain ID 4201)", heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 150 } }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            tableRow(["Contract", "Address"]),
            tableRow(["POAPForge", LUKSO.POAPForge]),
            tableRow(["Handshake", LUKSO.Handshake]),
            tableRow(["ReputationStation", LUKSO.ReputationStation]),
            tableRow(["LSP17VouchExtension", LUKSO.LSP17VouchExtension]),
          ],
        }),
        new Paragraph({ spacing: { after: 300 } }),

        new Paragraph({ text: "Base Sepolia (Chain ID 84532)", heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 150 } }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            tableRow(["Contract", "Address"]),
            tableRow(["POAPForge", BASE_SEPOLIA.POAPForge]),
            tableRow(["Handshake", BASE_SEPOLIA.Handshake]),
            tableRow(["ReputationStation", BASE_SEPOLIA.ReputationStation]),
            tableRow(["LSP17VouchExtension", BASE_SEPOLIA.LSP17VouchExtension]),
          ],
        }),
        new Paragraph({ spacing: { after: 400 } }),

        new Paragraph({ text: "2. Frontend Configuration (chainConfig.json)", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
        new Paragraph({
          text: "Location: frontend-handshake/shared/chainConfig.json",
          spacing: { after: 100 },
        }),
        new Paragraph({
          text: "Handshake addresses used by the frontend:",
          spacing: { after: 100 },
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            tableRow(["Chain", "Chain ID", "Handshake Address"]),
            tableRow(["LUKSO Testnet", "4201", LUKSO.Handshake]),
            tableRow(["Base Sepolia", "84532", BASE_SEPOLIA.Handshake]),
            tableRow(["Ethereum", "1", "(empty)"]),
            tableRow(["Base", "8453", "(empty)"]),
          ],
        }),
        new Paragraph({ spacing: { after: 400 } }),

        new Paragraph({ text: "3. Setup Checklist", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
        new Paragraph({ text: "• npm install", spacing: { after: 80 } }),
        new Paragraph({ text: "• cp .env.example .env — set PRIVATE_KEY", spacing: { after: 80 } }),
        new Paragraph({ text: "• Get testnet funds (LUKSO faucet, Base Sepolia faucet)", spacing: { after: 80 } }),
        new Paragraph({ text: "• npm run compile && npm run test", spacing: { after: 80 } }),
        new Paragraph({ text: "• npx hardhat run scripts/deploy.js --network luksoTestnet", spacing: { after: 80 } }),
        new Paragraph({ text: "• npx hardhat run scripts/deploy.js --network baseSepolia", spacing: { after: 80 } }),
        new Paragraph({ text: "• Update chainConfig.json with new Handshake addresses", spacing: { after: 80 } }),
        new Paragraph({ text: "• Update indexer/subgraph.yaml if using the subgraph", spacing: { after: 80 } }),
        new Paragraph({ text: "• cd frontend-handshake && npm run dev", spacing: { after: 300 } }),

        new Paragraph({ text: "4. Key File Locations", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            tableRow(["Purpose", "Path"]),
            tableRow(["Chain config", "frontend-handshake/shared/chainConfig.json"]),
            tableRow(["Handshake ABI", "frontend-handshake/shared/HandshakeAbi.json"]),
            tableRow(["Deploy script", "scripts/deploy.js"]),
            tableRow(["Indexer config", "indexer/subgraph.yaml"]),
            tableRow(["API vouches", "frontend-handshake/api/vouches.js"]),
          ],
        }),
        new Paragraph({ spacing: { after: 400 } }),

        new Paragraph({ text: "5. RPC URLs", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
        new Paragraph({ text: `LUKSO Testnet: ${LUKSO.rpc}`, spacing: { after: 80 } }),
        new Paragraph({ text: `Base Sepolia: ${BASE_SEPOLIA.rpc}`, spacing: { after: 80 } }),
      ],
    },
  ],
});

async function main() {
  const buffer = await Packer.toBuffer(doc);
  const outPath = path.join(__dirname, "..", "Ohana_Contract_Addresses_Reference.docx");
  fs.writeFileSync(outPath, buffer);
  console.log("Created:", outPath);
}

main().catch(console.error);
