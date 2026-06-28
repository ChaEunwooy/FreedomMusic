import { useState, useCallback, useEffect, useRef, type FC } from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faSpinner, faCheck, faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n';
import { getLoginQrKey, createLoginQr, checkLoginQr } from '../../services/api';

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
}

const QR_REFRESH_INTERVAL = 30_000;
const POLL_INTERVAL = 2500;

const LoginModal: FC<LoginModalProps> = ({ open, onClose }) => {
  const { t } = useI18n();
  const { authError, qrLogin } = useAuth();
  const [localError, setLocalError] = useState('');
  const [success, setSuccess] = useState(false);
  const [qrImg, setQrImg] = useState('');
  const [qrStatus, setQrStatus] = useState<'loading' | 'pending' | 'scanned' | 'expired'>('loading');
  const [isLogging, setIsLogging] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loggingRef = useRef(false);
  const unikeyRef = useRef('');

  const clearAllTimers = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    setLocalError('');
    setSuccess(false);
    setQrImg('');
    setQrStatus('loading');
    loggingRef.current = false;
    setIsLogging(false);
    unikeyRef.current = '';
    clearAllTimers();
  }, [clearAllTimers]);

  const startPolling = useCallback((unikey: string) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    let stopped = false;

    pollTimerRef.current = setInterval(async () => {
      if (loggingRef.current || stopped) return;
      stopped = true;
      try {
        const { data } = await checkLoginQr(unikey);
        const { code } = data;

        if (code === 803) {
          clearAllTimers();
          loggingRef.current = true;
          setIsLogging(true);
          setQrStatus('scanned');
          try {
            await qrLogin();
            setSuccess(true);
            setTimeout(() => {
              reset();
              onClose();
            }, 800);
          } catch (err: unknown) {
            setLocalError(err instanceof Error ? err.message : t('auth.login_failed'));
            setQrStatus('expired');
            loggingRef.current = false;
            setIsLogging(false);
          }
        } else if (code === 802) {
          setQrStatus('scanned');
          stopped = false;
        } else if (code === 800) {
          clearAllTimers();
          setQrStatus('expired');
        } else {
          stopped = false;
        }
      } catch {
        stopped = false;
      }
    }, POLL_INTERVAL);
  }, [qrLogin, onClose, reset, clearAllTimers]);

  const startQrLogin = useCallback(async () => {
    setQrStatus('loading');
    setQrImg('');
    setLocalError('');
    loggingRef.current = false;
    setIsLogging(false);
    clearAllTimers();

    try {
      const { data: keyData } = await getLoginQrKey();
      const unikey = keyData.unikey || keyData.data?.unikey;
      if (!unikey) {
        setLocalError(t('auth.fetch_failed'));
        setQrStatus('expired');
        return;
      }

      unikeyRef.current = unikey;

      const { data: qrData } = await createLoginQr(unikey);
      const qrimg = qrData.qrimg || qrData.data?.qrimg;
      if (!qrimg) {
        setLocalError(t('auth.generate_failed'));
        setQrStatus('expired');
        return;
      }

      setQrImg(qrimg);
      setQrStatus('pending');
      startPolling(unikey);

      refreshTimerRef.current = setInterval(() => {
        if (loggingRef.current) {
          if (refreshTimerRef.current) {
            clearInterval(refreshTimerRef.current);
            refreshTimerRef.current = null;
          }
          return;
        }
        startQrLogin();
      }, QR_REFRESH_INTERVAL);
    } catch {
      setLocalError(t('auth.init_failed'));
      setQrStatus('expired');
    }
  }, [startPolling, clearAllTimers]);

  useEffect(() => {
    if (open) {
      reset();
      const t = setTimeout(() => startQrLogin(), 0);
      return () => {
        clearTimeout(t);
        clearAllTimers();
      };
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  const errorMsg = localError || authError;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => { clearAllTimers(); reset(); onClose(); }}>
      <div className="relative w-[380px] rounded-[28px] p-8 clear-glass flex flex-col" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => { clearAllTimers(); reset(); onClose(); }} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all">
          <FontAwesomeIcon icon={faXmark} />
        </button>

        {/* 二维码 */}
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-400/30 to-blue-500/30 flex items-center justify-center mb-4 border border-white/15">
            <FontAwesomeIcon icon={faWandMagicSparkles} className="text-2xl text-cyan-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2 text-center">{t('auth.qr_title')}</h3>
          <p className="text-xs text-white/40 mb-6 text-center">{t('auth.qr_subtitle')}</p>

          <div className="w-48 h-48 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 overflow-hidden">
            {qrStatus === 'loading' && (
              <FontAwesomeIcon icon={faSpinner} className="text-3xl text-white/30 animate-spin" />
            )}
            {qrStatus === 'pending' && qrImg && (
              <img src={qrImg} alt="QR Code" className="w-full h-full object-contain p-2" />
            )}
            {qrStatus === 'scanned' && (
              <div className="flex flex-col items-center gap-2">
                <FontAwesomeIcon icon={faSpinner} className="text-3xl text-cyan-400 animate-spin" />
                <span className="text-xs text-cyan-400">{isLogging ? t('auth.logging_in') : t('auth.scanned')}</span>
              </div>
            )}
            {qrStatus === 'expired' && (
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs text-white/40">{t('auth.expired')}</span>
                <button onClick={startQrLogin} className="text-xs text-cyan-400 hover:underline">{t('auth.refresh_qr')}</button>
              </div>
            )}
          </div>

          {errorMsg && <p className="text-xs text-red-400 mb-3 text-center">{errorMsg}</p>}
          {success && (
            <div className="flex items-center justify-center gap-2 mb-3">
              <FontAwesomeIcon icon={faCheck} className="text-green-400" />
              <span className="text-xs text-green-400 font-bold">{t('auth.login_success')}</span>
            </div>
          )}

          <p className="text-xs text-white/30 text-center mt-2">
            {t('auth.qr_hint')}
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default LoginModal;
