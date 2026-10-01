import type { Metadata } from "next";
import Link from "next/link";
import { canonicalMeta } from "@/lib/seo";
import LegalLayout from "@/components/LegalLayout";

export const metadata: Metadata = {
  ...canonicalMeta("refund-policy"),
  title: "Refund Policy — Audityxe",
  description: "When Audityxe issues refunds, how to request one, and what crypto payments mean for refunds.",
};

export default function RefundPolicyPage() {
  return (
    <LegalLayout title="Refund Policy" updated="September 2026" path="refund-policy">
      <p>
        Short version: if Audityxe didn&apos;t do what it said it would, ask for your money back and
        you&apos;ll get it. The detail below exists so you know exactly where you stand before you pay,
        not to create escape hatches.
      </p>

      <h2>1. 14-day good-faith refund window</h2>
      <p>
        You can request a full refund within <strong>14 days</strong> of a payment, for any reason,
        as long as the plan hasn&apos;t been used heavily (as a rough line: fewer than 20 audits run on
        the paid plan in that period). No justification required inside that window.
      </p>

      <h2>2. Refunds we&apos;ll give regardless of the window</h2>
      <ul>
        <li>You were charged twice for the same period.</li>
        <li>A paid feature was unavailable or broken for a sustained period and you couldn&apos;t use what you paid for.</li>
        <li>Your plan was not activated after a confirmed payment.</li>
        <li>You were charged after cancelling, or for a period you never had access to.</li>
      </ul>

      <h2>3. What isn&apos;t refundable</h2>
      <ul>
        <li>
          Periods already substantially used — if you&apos;ve run a large volume of audits on a paid
          plan for most of a billing period, that period is considered delivered.
        </li>
        <li>
          Dissatisfaction with audit <em>findings</em> themselves. Audityxe reports what it
          measures on your site; a low score is the product working, not failing. See the{" "}
          <Link href="/methodology">Methodology</Link> page for exactly what is and isn&apos;t measured
          before purchasing.
        </li>
        <li>
          Third-party costs you incur yourself, such as Google Cloud charges on your own PageSpeed
          Insights API key. Those are billed by Google, not by us, and we can&apos;t refund them.
        </li>
        <li>Accounts terminated for violating the <Link href="/acceptable-use">Acceptable Use Policy</Link>.</li>
      </ul>

      <h2>4. Crypto payments — please read this part</h2>
      <p>
        Audityxe accepts cryptocurrency via NOWPayments. Crypto payments are{" "}
        <strong>irreversible on the blockchain</strong> — there is no chargeback mechanism, and
        neither we nor NOWPayments can &quot;undo&quot; a transaction. That doesn&apos;t remove your right to a
        refund under this policy; it changes how one is delivered:
      </p>
      <ul>
        <li>
          Approved refunds are sent as a <strong>new transaction</strong> to a wallet address you
          provide, in the same asset you paid with unless we agree otherwise.
        </li>
        <li>
          The refund is calculated on the <strong>USD amount</strong> of your original payment. Because
          crypto prices move, the amount of coin you receive back may differ from the amount you
          sent. We refund the value you paid, not the coin quantity.
        </li>
        <li>
          Network (gas) fees for sending the refund are deducted from the refunded amount, since
          those are paid to the blockchain and not to us.
        </li>
        <li>
          <strong>Double-check the wallet address you give us.</strong> Funds sent to an incorrect
          address cannot be recovered by anyone.
        </li>
      </ul>

      <h2>5. Donations</h2>
      <p>
        Voluntary donations or sponsorships are not purchases and are non-refundable, since nothing
        is being sold or delivered in exchange. If you donated by mistake, contact us anyway and
        we&apos;ll sort it out.
      </p>

      <h2>6. How to request a refund</h2>
      <p>
        Email <a href="mailto:zelvior@proton.me">zelvior@proton.me</a> or use the{" "}
        <Link href="/contact">Contact page</Link>, including the email on your account, the
        approximate payment date, and (for crypto) the transaction hash and the wallet address to
        refund to. We aim to respond within <strong>3 business days</strong> and to send approved
        refunds within <strong>10 business days</strong> of approval.
      </p>

      <h2>7. Cancelling</h2>
      <p>
        Crypto plans are paid per period and do not auto-renew — there is no recurring charge to
        cancel. When the period ends, the account simply returns to the Free plan unless you choose
        to pay again. You keep paid access for the full period you already paid for.
      </p>
    </LegalLayout>
  );
}
