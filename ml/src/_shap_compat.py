"""Make ``import shap`` work on machines where numba cannot load.

SHAP only needs numba's ``@njit`` decorator for its clustering /
partitioning helpers — the TreeExplainer path used by this pipeline is
pure NumPy + the compiled ``shap._cext`` extension and never calls them.

On Windows machines with an Enterprise Code Integrity / Smart App Control
policy (deployed here on 2026-10-09, event `CodeIntegrity 3033/3077`),
the unsigned ``llvmlite.dll`` that numba loads at import time is blocked,
so ``import shap`` dies with:

    OSError: Could not find/load shared object file 'llvmlite.dll'

``ensure_shap_importable()`` tries ``import numba`` first; when that
succeeds it does nothing (healthy machines always use real numba).  When
numba is blocked or missing it installs a tiny import-only stub so SHAP
loads — all SHAP math then runs uncompiled with identical results.
"""
from __future__ import annotations

import sys
import types


def _passthrough(*args, **kwargs):
    """Identity decorator usable as ``@njit``, ``@njit(...)`` or call."""
    if len(args) == 1 and callable(args[0]) and not kwargs:
        return args[0]
    return lambda fn: fn


def _stub_module(name: str) -> types.ModuleType:
    mod = types.ModuleType(name)

    def __getattr__(attr: str):  # PEP 562 — unknown numba.* attributes
        if attr in ("prange",):
            return range
        return _passthrough

    mod.__getattr__ = __getattr__  # type: ignore[attr-defined]
    return mod


_installed = False


def ensure_shap_importable() -> None:
    """Import shap (installing the numba stub only if numba is unusable)."""
    global _installed

    if _installed:
        return

    try:
        import numba  # noqa: F401  — probes llvmlite.dll / numba health
    except (OSError, ImportError):
        _purge("numba")
        numba_mod = _stub_module("numba")
        typed_mod = _stub_module("numba.typed")
        typed_mod.List = type("List", (list,), {})
        typed_mod.Dict = type("Dict", (dict,), {})
        typed_mod.TypedList = typed_mod.List
        typed_mod.TypedDict = typed_mod.Dict
        numba_mod.typed = typed_mod
        numba_mod.njit = _passthrough
        numba_mod.jit = _passthrough
        numba_mod.prange = range
        numba_mod.vectorize = _passthrough
        numba_mod.guvectorize = _passthrough
        numba_mod.set_num_threads = lambda n: None
        numba_mod.get_num_threads = lambda: 1
        sys.modules["numba"] = numba_mod
        sys.modules["numba.typed"] = typed_mod

    import shap  # noqa: F401  — verify the stub was enough

    _installed = True


def _purge(prefix: str) -> None:
    for key in [k for k in sys.modules if k == prefix or k.startswith(prefix + ".")]:
        del sys.modules[key]
