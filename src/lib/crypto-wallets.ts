import { HDKey } from "@scure/bip32";
import { mnemonicToSeedSync } from "@scure/bip39";
import { ethers } from "ethers";
import * as bitcoin from "bitcoinjs-lib";
import * as ecc from "tiny-secp256k1";

// Initialize bitcoinjs-lib with ecc
bitcoin.initEccLib(ecc);

// Litecoin network parameters
const litecoinNetwork: bitcoin.Network = {
  messagePrefix: "\x19Litecoin Signed Message:\n",
  bech32: "ltc",
  bip32: {
    public: 0x019da462,
    private: 0x019d9cfe,
  },
  pubKeyHash: 0x30,
  scriptHash: 0x32,
  wif: 0xb0,
};

interface WalletAddresses {
  BTC: string;
  ETH: string;
  LTC: string;
}

/**
 * Get the master seed from environment variable
 * If not set, throws an error
 */
function getMasterSeed(): Uint8Array {
  const mnemonic = process.env.CRYPTO_MASTER_MNEMONIC;
  if (!mnemonic) {
    throw new Error("CRYPTO_MASTER_MNEMONIC not set in environment variables");
  }
  return mnemonicToSeedSync(mnemonic);
}

/**
 * Generate BTC address from HD wallet at given index
 * Using BIP84 (native segwit) path: m/84'/0'/0'/0/{index}
 */
function generateBTCAddress(seed: Uint8Array, index: number): string {
  const hdKey = HDKey.fromMasterSeed(seed);
  const path = `m/84'/0'/0'/0/${index}`;
  const child = hdKey.derive(path);

  if (!child.publicKey) {
    throw new Error("Failed to derive BTC public key");
  }

  const { address } = bitcoin.payments.p2wpkh({
    pubkey: Buffer.from(child.publicKey),
    network: bitcoin.networks.bitcoin,
  });

  if (!address) {
    throw new Error("Failed to generate BTC address");
  }

  return address;
}

/**
 * Generate ETH address from HD wallet at given index
 * Using BIP44 path: m/44'/60'/0'/0/{index}
 */
function generateETHAddress(seed: Uint8Array, index: number): string {
  const hdKey = HDKey.fromMasterSeed(seed);
  const path = `m/44'/60'/0'/0/${index}`;
  const child = hdKey.derive(path);

  if (!child.privateKey) {
    throw new Error("Failed to derive ETH private key");
  }

  const wallet = new ethers.Wallet(Buffer.from(child.privateKey).toString("hex"));
  return wallet.address;
}

/**
 * Generate LTC address from HD wallet at given index
 * Using BIP84 path for Litecoin: m/84'/2'/0'/0/{index}
 */
function generateLTCAddress(seed: Uint8Array, index: number): string {
  const hdKey = HDKey.fromMasterSeed(seed);
  const path = `m/84'/2'/0'/0/${index}`;
  const child = hdKey.derive(path);

  if (!child.publicKey) {
    throw new Error("Failed to derive LTC public key");
  }

  const { address } = bitcoin.payments.p2wpkh({
    pubkey: Buffer.from(child.publicKey),
    network: litecoinNetwork,
  });

  if (!address) {
    throw new Error("Failed to generate LTC address");
  }

  return address;
}

/**
 * Generate all wallet addresses for a worker at given derivation index
 */
export function generateWalletAddresses(derivationIndex: number): WalletAddresses {
  const seed = getMasterSeed();

  return {
    BTC: generateBTCAddress(seed, derivationIndex),
    ETH: generateETHAddress(seed, derivationIndex),
    LTC: generateLTCAddress(seed, derivationIndex),
  };
}

/**
 * Get the next available derivation index from the database
 */
export async function getNextDerivationIndex(prisma: unknown): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lastWallet = await (prisma as any).cryptoWallet.findFirst({
    orderBy: { derivationIndex: "desc" },
    select: { derivationIndex: true },
  });

  return lastWallet ? lastWallet.derivationIndex + 1 : 0;
}
