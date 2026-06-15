import { useCallback, useEffect, useState } from 'react';
import { api, normalizeList, getErrorMessage } from '../api/client';

export function useApiList(path, params = {}, deps = []) {
  const [items, setItems] = useState([]);
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.list(path, params);
      setPayload(data);
      setItems(normalizeList(data));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [path, JSON.stringify(params), ...deps]);

  useEffect(() => { load(); }, [load]);

  return { items, payload, loading, error, reload: load, setItems };
}

export function useApiDetail(path, deps = []) {
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setItem(await api.get(path));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [path, ...deps]);

  useEffect(() => { load(); }, [load]);
  return { item, loading, error, reload: load, setItem };
}
