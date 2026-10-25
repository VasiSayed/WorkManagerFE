import { useEffect, useMemo, useState } from 'react';
import { getErrorMessage } from '../../api/client';
import { T } from '../../theme';
import {
  Check, choiceOptions, FormGrid, FormModal, isPositive, KV, localDate, Muted, MoneyIn, newRequestKey, parseAmount,
  Pick, pm, rupees, TextIn, titleCase, useOptions,
} from './shared';

/**
 * Records a payment for one agreement. The idempotency key is fixed while the modal is open,
 * so a double click or a retry after an overpayment prompt can never record twice.
 * target: { agreementId, tenantName, unitName?, amount?, chargeIds? }
 */
export default function PaymentModal({ target, onClose, onSaved }) {
  const options = useOptions();
  const [balance, setBalance] = useState(null);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(localDate());
  const [method, setMethod] = useState('cash');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [key, setKey] = useState(newRequestKey());

  useEffect(() => {
    if (!target) return;
    setKey(newRequestKey());
    setDate(localDate());
    setMethod('cash');
    setReference('');
    setNotes('');
    setError('');
    setBalance(null);
    setSelected(target.chargeIds || []);
    setAmount(target.amount ? String(Number(target.amount)) : '');
    pm.agreementBalance(target.agreementId).then((b) => {
      setBalance(b);
      if (!target.amount) setAmount(String(Number(b.balance.total_outstanding)));
    }).catch((err) => setError(getErrorMessage(err)));
  }, [target]);

  const openCharges = balance?.open_charges || [];
  const selectedTotal = useMemo(
    () => openCharges.filter((c) => selected.includes(c.id)).reduce((s, c) => s + Number(c.outstanding), 0),
    [openCharges, selected],
  );

  const toggle = (id) => {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    setSelected(next);
    const total = openCharges.filter((c) => next.includes(c.id)).reduce((s, c) => s + Number(c.outstanding), 0);
    setAmount(String(next.length ? total : Number(balance?.balance.total_outstanding || 0)));
  };

  const parsed = parseAmount(amount);

  const submit = async () => {
    if (!parsed || !isPositive(parsed)) { setError('Enter an amount greater than zero.'); return; }
    setBusy(true);
    setError('');
    const body = {
      agreement: target.agreementId,
      amount: parsed,
      payment_date: date,
      method,
      reference,
      notes,
      charge_ids: selected.length ? selected : undefined,
      idempotency_key: key,
    };
    try {
      let payment;
      try {
        payment = await pm.recordPayment(body);
      } catch (err) {
        if (err?.body?.code !== 'overpayment_confirmation_required') throw err;
        const excess = rupees(err.body.excess);
        if (!window.confirm(`${target.tenantName} is paying ${excess} more than what is due.\n\nKeep the extra ${excess} as advance credit?`)) { setBusy(false); return; }
        payment = await pm.recordPayment({ ...body, excess_handling: 'advance_credit' });
      }
      onSaved?.(payment);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const methods = choiceOptions(options.payment_methods);

  return (
    <FormModal
      open={!!target}
      onClose={onClose}
      title={`Collect payment · ${target?.tenantName || ''}`}
      subtitle={target?.unitName}
      onSubmit={submit}
      submitLabel={parsed ? `Record ${rupees(parsed)}` : 'Record payment'}
      busy={busy}
      disabled={!parsed}
      error={error}
    >
      {balance && (
        <div style={{ background: T.rowAlt, border: `1px solid ${T.border}`, borderRadius: 10, padding: '8px 12px' }}>
          <KV label="Total outstanding" value={rupees(balance.balance.total_outstanding)} strong tone={isPositive(balance.balance.total_outstanding) ? T.error : T.success} />
          {isPositive(balance.balance.advance_credit) && <KV label="Advance credit" value={rupees(balance.balance.advance_credit)} tone={T.info} />}
        </div>
      )}
      {openCharges.length > 0 && (
        <div>
          <Muted style={{ marginBottom: 4 }}>Pay specific charges (optional — otherwise the oldest dues are cleared first)</Muted>
          {openCharges.map((c) => (
            <Check key={c.id} checked={selected.includes(c.id)} onChange={() => toggle(c.id)} label={`${c.description} · ${rupees(c.outstanding)}`} hint={`${titleCase(c.type)} · due ${c.due_date}`} />
          ))}
          {selected.length > 0 && <Muted>Selected: {rupees(selectedTotal)}</Muted>}
        </div>
      )}
      <FormGrid min={180}>
        <MoneyIn label="Amount (₹)" required value={amount} onChange={setAmount} autoFocus />
        <TextIn label="Payment date" type="date" value={date} onChange={setDate} />
        <Pick label="Method" value={method} onChange={setMethod} options={methods.length ? methods : [['cash', 'Cash']]} />
        <TextIn label="Reference / UPI ID" value={reference} onChange={setReference} />
      </FormGrid>
      <TextIn label="Notes" value={notes} onChange={setNotes} />
    </FormModal>
  );
}

export function paymentSummary(payment) {
  const lines = (payment.allocations || []).map((a) => `• ${a.charge_description}: ${rupees(a.amount)}`);
  if (isPositive(payment.unapplied_amount)) lines.push(`• Advance credit: ${rupees(payment.unapplied_amount)}`);
  if (payment.duplicate) lines.unshift('This payment was already recorded — no duplicate was created.');
  if (payment.agreement_balance) lines.push(`Remaining balance: ${rupees(payment.agreement_balance.total_outstanding)}`);
  return lines.join('\n');
}
