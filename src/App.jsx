import { useState } from "react";
import * as StellarSdk from "@stellar/stellar-sdk";
import * as FreighterAPI from "@stellar/freighter-api";

const server = new StellarSdk.Horizon.Server("https://horizon-testnet.stellar.org");

export default function App() {
  const [wallet, setWallet] = useState(null);
  const [balance, setBalance] = useState(null);
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [txResult, setTxResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const connect = async () => {
    try {
      await FreighterAPI.requestAccess();
      const result = await FreighterAPI.getAddress();
      const pubKey = result.address;
      setWallet(pubKey);
      const account = await server.loadAccount(pubKey);
      const xlm = account.balances.find((b) => b.asset_type === "native");
      setBalance(xlm ? xlm.balance : "0");
    } catch (e) {
      alert("Error: " + e.message);
    }
  };

  const disconnect = () => {
    setWallet(null);
    setBalance(null);
    setTxResult(null);
  };

  const sendPayment = async () => {
    if (!destination || !amount) return alert("Fill in destination and amount!");
    setLoading(true);
    setTxResult(null);
    try {
      const account = await server.loadAccount(wallet);
      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET,
      })
        .addOperation(
          StellarSdk.Operation.payment({
            destination,
            asset: StellarSdk.Asset.native(),
            amount: amount.toString(),
          })
        )
        .setTimeout(30)
        .build();

      const signed = await FreighterAPI.signTransaction(tx.toXDR(), {
        networkPassphrase: StellarSdk.Networks.TESTNET,
      });
      const txEnvelope = StellarSdk.TransactionBuilder.fromXDR(
        signed.signedTxXdr,
        StellarSdk.Networks.TESTNET
      );
      const result = await server.submitTransaction(txEnvelope);
      setTxResult({ success: true, hash: result.hash });
      const updated = await server.loadAccount(wallet);
      const xlm = updated.balances.find((b) => b.asset_type === "native");
      setBalance(xlm ? xlm.balance : "0");
    } catch (e) {
      setTxResult({ success: false, error: e.message });
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 500, margin: "60px auto", fontFamily: "sans-serif", padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: "bold", marginBottom: 8 }}>⭐ Stellar Pay</h1>
      <p style={{ color: "#666", marginBottom: 24 }}>Simple XLM payments on Testnet</p>

      {!wallet ? (
        <button onClick={connect} style={btnStyle("#6c47ff")}>
          🔗 Connect Freighter Wallet
        </button>
      ) : (
        <>
          <div style={cardStyle}>
            <p style={{ fontSize: 12, color: "#888" }}>Connected Wallet</p>
            <p style={{ fontSize: 13, wordBreak: "break-all", fontWeight: "bold" }}>{wallet}</p>
            <p style={{ fontSize: 24, fontWeight: "bold", marginTop: 8 }}>💰 {balance} XLM</p>
            <button onClick={disconnect} style={{ ...btnStyle("#e53e3e"), marginTop: 12, fontSize: 13 }}>
              Disconnect
            </button>
          </div>

          <div style={cardStyle}>
            <h2 style={{ marginBottom: 12 }}>Send XLM</h2>
            <input
              placeholder="Destination address"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              style={inputStyle}
            />
            <input
              placeholder="Amount (XLM)"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={inputStyle}
            />
            <button onClick={sendPayment} disabled={loading} style={btnStyle("#38a169")}>
              {loading ? "Sending..." : "🚀 Send Payment"}
            </button>
          </div>

          {txResult && (
            <div style={{ ...cardStyle, background: txResult.success ? "#f0fff4" : "#fff5f5", borderColor: txResult.success ? "#38a169" : "#e53e3e" }}>
              {txResult.success ? (
                <>
                  <p style={{ color: "#38a169", fontWeight: "bold" }}>✅ Transaction Successful!</p>
                  <p style={{ fontSize: 12, wordBreak: "break-all" }}>Hash: {txResult.hash}</p>
                  <a href={`https://stellar.expert/explorer/testnet/tx/${txResult.hash}`} target="_blank" rel="noreferrer" style={{ color: "#6c47ff", fontSize: 13 }}>
                    View on Explorer →
                  </a>
                </>
              ) : (
                <p style={{ color: "#e53e3e" }}>❌ Error: {txResult.error}</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const btnStyle = (bg) => ({
  background: bg, color: "white", border: "none", padding: "12px 24px",
  borderRadius: 8, cursor: "pointer", fontWeight: "bold", width: "100%", fontSize: 15,
});
const cardStyle = {
  border: "1px solid #e2e8f0", borderRadius: 12, padding: 20, marginBottom: 16,
};
const inputStyle = {
  width: "100%", padding: "10px 12px", marginBottom: 10, borderRadius: 8,
  border: "1px solid #e2e8f0", fontSize: 14, boxSizing: "border-box",
};