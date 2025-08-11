'use client';
import { useMemo, useState } from 'react';
import { estimateCleaning, type CleaningEstimateInput } from '@/lib/cleaningEstimator';
import {useTranslations, useLocale} from 'next-intl';

function currency(cents: number, locale = 'en-CA', currency = 'CAD') {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(cents / 100);
}

const start: CleaningEstimateInput = {
  square_feet: 1000,
  bedrooms: 2,
  bathrooms: 1,
  kitchen_condition: 'normal',
  clutter_level: 'normal',
  pets: 'one',
  frequency: 'one_time',
  service_type: 'deep_clean',
  inside_fridge: false,
  inside_oven: true,
  interior_windows_count: 0,
  baseboards: true,
  cabinet_fronts: false,
  laundry_folding: false,
  hourly_rate_cents: 4000,
  min_hours: 2
};

export default function CleaningEstimator() {
  const [form, setForm] = useState<CleaningEstimateInput>(start);
  const t = useTranslations('estimator');
  const locale = useLocale();

  const result = useMemo(() => estimateCleaning(form), [form]);
  function set<K extends keyof CleaningEstimateInput>(key: K, value: CleaningEstimateInput[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold mb-4">{t('title')}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <label className="col-span-2 text-sm">{t('square_feet')}</label>
            <input type="number" className="border rounded-xl px-3 py-2"
              value={form.square_feet}
              onChange={e => set('square_feet', Math.max(300, Number(e.target.value || 0)))} />

            <label className="text-sm">{t('bedrooms')}</label>
            <input type="number" className="border rounded-xl px-3 py-2"
              value={form.bedrooms}
              onChange={e => set('bedrooms', Math.max(0, Number(e.target.value || 0)))} />

            <label className="text-sm">{t('bathrooms')}</label>
            <input type="number" className="border rounded-xl px-3 py-2"
              value={form.bathrooms}
              onChange={e => set('bathrooms', Math.max(0, Number(e.target.value || 0)))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">{t('kitchen_condition')}</label>
              <select className="border rounded-xl px-3 py-2 w-full" value={form.kitchen_condition}
                onChange={e => set('kitchen_condition', e.target.value as any)}>
                <option value="normal">{t('kitchen.normal')}</option>
                <option value="greasy">{t('kitchen.greasy')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">{t('clutter_level')}</label>
              <select className="border rounded-xl px-3 py-2 w-full" value={form.clutter_level}
                onChange={e => set('clutter_level', e.target.value as any)}>
                <option value="tidy">{t('clutter.tidy')}</option>
                <option value="normal">{t('clutter.normal')}</option>
                <option value="cluttered">{t('clutter.cluttered')}</option>
                <option value="very_cluttered">{t('clutter.very_cluttered')}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">{t('pets.label')}</label>
              <select className="border rounded-xl px-3 py-2 w-full" value={form.pets}
                onChange={e => set('pets', e.target.value as any)}>
                <option value="none">{t('pets.none')}</option>
                <option value="one">{t('pets.one')}</option>
                <option value="two_plus">{t('pets.two_plus')}</option>
                <option value="heavy_shedding">{t('pets.heavy_shedding')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">{t('frequency.label')}</label>
              <select className="border rounded-xl px-3 py-2 w-full" value={form.frequency}
                onChange={e => set('frequency', e.target.value as any)}>
                <option value="one_time">{t('frequency.one_time')}</option>
                <option value="weekly">{t('frequency.weekly')}</option>
                <option value="biweekly">{t('frequency.biweekly')}</option>
                <option value="monthly">{t('frequency.monthly')}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1">{t('service_type')}</label>
            <select className="border rounded-xl px-3 py-2 w-full" value={form.service_type}
              onChange={e => set('service_type', e.target.value as any)}>
              <option value="standard_clean">{t('service.standard_clean')}</option>
              <option value="deep_clean">{t('service.deep_clean')}</option>
              <option value="move_in_out">{t('service.move_in_out')}</option>
              <option value="post_renovation">{t('service.post_renovation')}</option>
              <option value="rental_turnover">{t('service.rental_turnover')}</option>
            </select>
          </div>

          <fieldset className="border rounded-xl p-3 space-y-3">
            <legend className="text-sm font-medium px-1">{t('addons.label')}</legend>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={!!form.inside_fridge}
                onChange={e => set('inside_fridge', e.target.checked)} />
              {t('addons.inside_fridge')}
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={!!form.inside_oven}
                onChange={e => set('inside_oven', e.target.checked)} />
              {t('addons.inside_oven')}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">{t('addons.interior_windows')}</label>
              <input type="number" className="border rounded-xl px-3 py-2"
                value={form.interior_windows_count || 0}
                onChange={e => set('interior_windows_count', Math.max(0, Number(e.target.value || 0)))} />
            </div>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={!!form.baseboards}
                onChange={e => set('baseboards', e.target.checked)} />
              {t('addons.baseboards')}
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={!!form.cabinet_fronts}
                onChange={e => set('cabinet_fronts', e.target.checked)} />
              {t('addons.cabinet_fronts')}
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={!!form.laundry_folding}
                onChange={e => set('laundry_folding', e.target.checked)} />
              {t('addons.laundry_folding')}
            </label>
          </fieldset>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">{t('hourly_rate')}</label>
              <input type="number" className="border rounded-xl px-3 py-2 w-full"
                value={form.hourly_rate_cents/100}
                onChange={e => set('hourly_rate_cents', Math.max(0, Math.round(Number(e.target.value || 0) * 100)))} />
            </div>
            <div>
              <label className="block text-sm mb-1">{t('min_hours')}</label>
              <input type="number" step="0.25" className="border rounded-xl px-3 py-2 w-full"
                value={form.min_hours || 0}
                onChange={e => set('min_hours', Math.max(0, Number(e.target.value || 0)))} />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border p-4 shadow-sm">
            <h2 className="text-lg font-medium mb-2">{t('estimate')}</h2>
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-4xl font-semibold">{result.billable_hours.toFixed(2)} h</div>
                <p className="text-xs text-gray-500">{t('rounding_note')}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-semibold">{currency(result.estimated_cost_cents, locale === 'fr' ? 'fr-CA' : 'en-CA')}</div>
                <p className="text-xs text-gray-500">{t('at_rate', {rate: (form.hourly_rate_cents/100).toFixed(2)})}</p>
              </div>
            </div>
          </div>

          <details className="rounded-2xl border p-4">
            <summary className="cursor-pointer font-medium">{t('how')}</summary>
            <p className="text-sm mt-2">{t('raw_hours', {hours: result.raw_hours.toFixed(2)})}</p>
          </details>
        </div>
      </div>
    </div>
  );
}
