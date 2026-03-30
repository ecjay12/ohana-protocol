const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Ohana Protocol", function () {
  let poapForge, handshake, repStation, ext;
  let owner, feeCollector, user1, user2;

  before(async function () {
    [owner, feeCollector, user1, user2] = await ethers.getSigners();

    const POAPForge = await ethers.getContractFactory("POAPForge");
    poapForge = await POAPForge.deploy();
    await poapForge.waitForDeployment();

    const Handshake = await ethers.getContractFactory("Handshake");
    handshake = await Handshake.deploy(feeCollector.address);
    await handshake.waitForDeployment();

    const ReputationStation = await ethers.getContractFactory("ReputationStation");
    repStation = await ReputationStation.deploy();
    await repStation.waitForDeployment();

    const LSP17VouchExtension = await ethers.getContractFactory("LSP17VouchExtension");
    ext = await LSP17VouchExtension.deploy();
    await ext.waitForDeployment();
  });

  describe("POAPForge", function () {
    it("should create event with NFT and token", async function () {
      const tx = await poapForge.createEvent(
        "event1",
        "Event NFT",
        "ENFT",
        "Event Token",
        "ETKN",
        owner.address,
        500
      );
      const receipt = await tx.wait();
      expect(receipt).to.be.ok;
      const event1 = await poapForge.events(0);
      expect(event1.nftContract).to.not.equal(ethers.ZeroAddress);
      expect(event1.tokenContract).to.not.equal(ethers.ZeroAddress);
      expect(event1.creator).to.equal(owner.address);
    });

    it("POAPEventNFT should mint and support royaltyInfo", async function () {
      const event1 = await poapForge.events(0);
      const nft = await ethers.getContractAt("POAPEventNFT", event1.nftContract);
      await nft.mint(user1.address);
      const [receiver, amount] = await nft.royaltyInfo(0, ethers.parseEther("1"));
      expect(receiver).to.equal(owner.address);
      expect(amount).to.equal(ethers.parseEther("0.05"));
    });
  });

  describe("Handshake", function () {
    it("should vouch with category", async function () {
      await handshake.connect(user1).vouch(user2.address, 1, { value: 0 });
      const v = await handshake.getVouch(user2.address, user1.address);
      expect(v.status).to.equal(1);
      expect(v.category).to.equal(1);
    });

    it("should accept vouch", async function () {
      await handshake.connect(user2).acceptVouch(user1.address);
      const v = await handshake.getVouch(user2.address, user1.address);
      expect(v.status).to.equal(2);
    });

    it("should return accepted count", async function () {
      const count = await handshake.acceptedCount(user2.address);
      expect(count).to.equal(1n);
    });
  });

  describe("ReputationStation", function () {
    it("should get reputation hash", async function () {
      const hash = await repStation.getReputation(user2.address);
      expect(hash).to.equal(ethers.ZeroHash);
    });

    it("should set rep hash as updater", async function () {
      const h = ethers.keccak256(ethers.toUtf8Bytes("score:100"));
      await repStation.setRepHash(user2.address, h);
      expect(await repStation.getReputation(user2.address)).to.equal(h);
    });
  });

  describe("OhanaPoints hub", function () {
    let points, handshakeP, repP, impact, forgeP;

    before(async function () {
      const OhanaPoints = await ethers.getContractFactory("OhanaPoints");
      points = await OhanaPoints.deploy(owner.address);
      await points.waitForDeployment();
      const hub = await points.getAddress();

      const ImpactLedger = await ethers.getContractFactory("ImpactLedger");
      impact = await ImpactLedger.deploy(owner.address);
      await impact.waitForDeployment();

      const Handshake = await ethers.getContractFactory("Handshake");
      handshakeP = await Handshake.deploy(feeCollector.address);
      await handshakeP.waitForDeployment();

      const ReputationStation = await ethers.getContractFactory("ReputationStation");
      repP = await ReputationStation.deploy();
      await repP.waitForDeployment();

      const POAPForge = await ethers.getContractFactory("POAPForge");
      forgeP = await POAPForge.deploy();
      await forgeP.waitForDeployment();

      await points.grantRewarder(await handshakeP.getAddress());
      await points.grantRewarder(await forgeP.getAddress());
      await points.grantRewarder(await repP.getAddress());
      await points.grantRewarder(await impact.getAddress());
      await points.setTrustedFactory(await forgeP.getAddress());

      await handshakeP.setOhanaPointsHub(hub);
      await forgeP.setOhanaPointsHub(hub);
      await repP.setOhanaPointsHub(hub);
      await impact.setOhanaPointsHub(hub);
    });

    it("Handshake acceptVouch awards 15 / 10 via hub", async function () {
      await handshakeP.connect(user1).vouch(user2.address, 1, { value: 0 });
      await handshakeP.connect(user2).acceptVouch(user1.address);
      expect(await points.balanceOf(user2.address)).to.equal(15n);
      expect(await points.balanceOf(user1.address)).to.equal(10n);
    });

    it("ReputationStation awards 8 on first non-zero rep hash", async function () {
      const signers = await ethers.getSigners();
      const fresh = signers[8];
      const h = ethers.keccak256(ethers.toUtf8Bytes("rep:1"));
      await repP.setRepHash(fresh.address, h);
      expect(await points.balanceOf(fresh.address)).to.equal(8n);
      await repP.setRepHash(fresh.address, ethers.keccak256(ethers.toUtf8Bytes("rep:2")));
      expect(await points.balanceOf(fresh.address)).to.equal(8n);
    });

    it("ImpactLedger recordVerifiedAction awards 20", async function () {
      const signers = await ethers.getSigners();
      const fresh = signers[9];
      await impact.connect(owner).recordVerifiedAction(fresh.address);
      expect(await points.balanceOf(fresh.address)).to.equal(20n);
    });

    it("POAPForge createEvent awards 25 to creator", async function () {
      await forgeP.connect(user1).createEvent(
        "evt-ohana-test",
        "N",
        "N",
        "T",
        "T",
        owner.address,
        500
      );
      expect(await points.balanceOf(user1.address)).to.equal(10n + 25n);
    });
  });

  describe("LSP17VouchExtension", function () {
    it("should return full score for non-revoked vouch", async function () {
      const score = await ext.getEffectiveVouchScore(ethers.ZeroHash);
      expect(score).to.equal(10000n);
    });
  });

  describe("OhanaHandshakeRegistry", function () {
    let registry;
    let mockUP;

    before(async function () {
      const Registry = await ethers.getContractFactory("OhanaHandshakeRegistry");
      registry = await Registry.deploy(feeCollector.address);
      await registry.waitForDeployment();
      // Deploy a minimal contract as mock UP (UP must be a contract)
      const MockUP = await ethers.getContractFactory("ReputationStation");
      mockUP = await MockUP.deploy();
      await mockUP.waitForDeployment();
    });

    it("should vouch like Handshake", async function () {
      await registry.connect(user1).vouch(user2.address, 0, { value: 0 });
      const v = await registry.getVouch(user2.address, user1.address);
      expect(v.status).to.equal(1n);
    });

    it("should register EOA to UP", async function () {
      await registry.connect(user1).registerEOAtoUP(mockUP.target);
      expect(await registry.getUPForEOA(user1.address)).to.equal(mockUP.target);
    });

    it("should unregister EOA", async function () {
      await registry.connect(user1).unregisterEOAtoUP();
      expect(await registry.getUPForEOA(user1.address)).to.equal(ethers.ZeroAddress);
    });
  });
});
