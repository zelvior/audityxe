import type { Metadata } from "next";
import { canonicalMeta } from "@/lib/seo";
import LegalLayout from "@/components/LegalLayout";

export const metadata: Metadata = {
  ...canonicalMeta("license"),
  title: "License — Audityxe",
  description:
    "Audityxe Custom Open-Source License (ACOL-1.0): free to use, modify, and redistribute, provided Zelvior is credited as the original author.",
};

export default function LicensePage() {
  return (
    <LegalLayout title="License" updated="September 2026" path="license">
      <p>
        Audityxe is the <strong>original work of Zelvior</strong>, open-sourced at the
        canonical repository{" "}
        <a href="https://github.com/zelvior/audityxe" target="_blank" rel="noopener noreferrer">
          github.com/zelvior/audityxe
        </a>
        . It is released under a custom license, the{" "}
        <strong>Audityxe Custom Open-Source License (ACOL-1.0)</strong> — not MIT, Apache-2.0,
        GPL, or any OSI-approved license. The full text below is authoritative; the same text
        ships as <code>LICENSE.md</code> in the repository root.
      </p>

      <h2>1. Grant of Rights</h2>
      <p>
        Subject to the Attribution Requirement (Section 2) and the Conditions (Section 3),
        Zelvior grants a worldwide, royalty-free, non-exclusive license to use, study, modify,
        copy, fork, redistribute, and deploy the Software — including commercially — and to
        create and distribute derivative works ("Derivatives"), including rebranded or
        substantially modified versions.
      </p>
      <p>
        None of this is permitted unless the Attribution Requirement below is met in full, at
        all times, for as long as the Software or any Derivative is used, deployed, or
        distributed.
      </p>

      <h2>2. Attribution Requirement</h2>
      <p>
        This is the operative clause of the license. Every right above is conditioned on full
        compliance here — not merely encouraged by it.
      </p>
      <p>
        <strong>Who:</strong> Zelvior, the original author and creator of Audityxe
        (<code>zelvior@proton.me</code>), maintainer of the canonical repository.
      </p>
      <p>
        <strong>What the credit must say:</strong> it must explicitly state that this is the
        original work of Zelvior, and explicitly state that the project is open-source with a
        link to <code>https://github.com/zelvior/audityxe</code>. Vague phrasing ("based on
        open-source components") does not satisfy this. For example:
      </p>
      <p>
        <em>"Audityxe is the original work of Zelvior, open-sourced at
        https://github.com/zelvior/audityxe."</em>
      </p>
      <p>
        The credit must not be hidden, minimized, or buried — not only in a minified source map,
        a commit history, or a notice file nobody is told exists.
      </p>
      <p>
        <strong>Where it must appear</strong> (cumulatively, as relevant to your form of
        distribution):
      </p>
      <ul>
        <li>
          <strong>Source/repository:</strong> <code>LICENSE.md</code> included, unmodified in
          substance, at the root of any copy or fork.
        </li>
        <li>
          <strong>Public deployments:</strong> a clear, visible, legible notice an ordinary
          visitor can actually find — e.g. a footer, About/Credits page, or in-app About screen —
          stating the project is the original work of Zelvior and linking to the canonical
          repository.
        </li>
        <li>
          <strong>Redistributed source/packages:</strong> the README (or equivalent) must state,
          near the top, that the project originates from Zelvior's Audityxe with a link to the
          repository.
        </li>
        <li>
          <strong>Articles, tutorials, videos:</strong> written credit and a link in the
          accompanying text/description — not spoken credit alone.
        </li>
        <li>
          <strong>Derivatives/rebrands:</strong> renaming or restyling the project does not
          remove this obligation — a Derivative must still credit Zelvior as the original author
          of the underlying work.
        </li>
      </ul>
      <p>
        <strong>Never acceptable:</strong> claiming you (or anyone but Zelvior) are the original
        author; removing or altering the attribution notices; attribution that's technically
        present but effectively invisible; or redistributing under different terms that remove
        or weaken this requirement.
      </p>

      <h2>3. Conditions</h2>
      <ul>
        <li>
          <strong>Preserve the license:</strong> every copy/fork must retain{" "}
          <code>LICENSE.md</code> in full and unmodified in its terms.
        </li>
        <li>
          <strong>State changes:</strong> a modified Derivative must be clearly marked as
          modified, so it isn't mistaken for the unmodified original.
        </li>
        <li>
          <strong>No endorsement implied:</strong> being credited doesn't mean Zelvior endorses,
          sponsors, or is affiliated with your Derivative.
        </li>
        <li>
          <strong>Downstream propagation:</strong> if you redistribute, you must do so under this
          same license, so the Attribution Requirement keeps binding every downstream recipient.
        </li>
        <li>
          <strong>Trademarks:</strong> this license doesn't permit using the "Audityxe" name or
          logo for your own Derivative in a way that implies it's the official project.
        </li>
      </ul>

      <h2>4. Provided "AS-IS" — No Warranty, No Liability</h2>
      <p>
        <strong>
          The Software is provided strictly "as-is" and "as-available," with all faults and
          without warranty of any kind
        </strong>{" "}
        — no warranty of merchantability, fitness for a particular purpose, title,
        non-infringement, accuracy, reliability, security, or that it will be error-free or
        uninterrupted.
      </p>
      <p>
        <strong>
          Zelvior — the original author and provider of this Software — is not responsible for
          anything arising from its use, misuse, modification, deployment, or redistribution, by
          you or by any other party.
        </strong>{" "}
        This includes, without limitation: data loss or corruption, security vulnerabilities or
        breaches, downtime, inaccurate audit results or generated content, financial loss,
        reputational harm, third-party claims, or any other direct, indirect, incidental,
        special, consequential, exemplary, or punitive damages — even if advised of the
        possibility of such damages.
      </p>
      <p>
        This applies regardless of whether you obtained the Software directly from Zelvior's
        canonical repository or indirectly through a fork, mirror, Derivative, or any third
        party. You use, deploy, modify, and redistribute the Software entirely{" "}
        <strong>at your own risk</strong>, and you are solely responsible for evaluating its
        suitability for your purposes and for any legal/regulatory obligations tied to your use
        of it.
      </p>
      <p>
        Nothing in this license obligates Zelvior to provide support, maintenance, updates, or
        security patches, now or in the future. Where this disclaimer is unenforceable for a
        specific type of damage, Zelvior's total liability for it is limited to zero (USD $0), to
        the maximum extent the law permits.
      </p>

      <h2>5. Termination</h2>
      <p>
        Your rights terminate automatically if you fail to comply with the Attribution
        Requirement or any other condition above and don't cure that failure within{" "}
        <strong>14 days</strong> of becoming aware of it (or being notified). Termination doesn't
        affect downstream recipients who are themselves in compliance.
      </p>

      <h2>6. Summary (non-binding)</h2>
      <p>
        You can use, modify, self-host, build a business on, and redistribute Audityxe — for
        free, forever. The one thing you must always do is give Zelvior clear, visible credit as
        the original author and link back to{" "}
        <a href="https://github.com/zelvior/audityxe" target="_blank" rel="noopener noreferrer">
          github.com/zelvior/audityxe
        </a>
        . The Software is provided as-is, with no warranty, and Zelvior is not responsible for
        anything arising from its use. This summary does not override the binding terms above —
        see the full <code>LICENSE.md</code> in the repository for the authoritative text.
      </p>
    </LegalLayout>
  );
}
