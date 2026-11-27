"""Uniform error format: {"error": {"code", "message", "details"}}. No stack traces leak."""

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

log = logging.getLogger("qadam")


class AppError(Exception):
    def __init__(self, status: int, code: str, message: str, details: object | None = None):
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message
        self.details = details


def not_found(what: str = "Resource") -> AppError:
    return AppError(404, "not_found", f"{what} not found")


def forbidden(message: str = "You do not have permission to do this") -> AppError:
    return AppError(403, "forbidden", message)


def bad_request(message: str, code: str = "bad_request", details: object | None = None) -> AppError:
    return AppError(400, code, message, details)


def conflict(message: str, code: str = "conflict") -> AppError:
    return AppError(409, code, message)


def _body(code: str, message: str, details: object | None = None) -> dict:
    return {"error": {"code": code, "message": message, "details": details}}


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _app_error(_: Request, exc: AppError):
        return JSONResponse(_body(exc.code, exc.message, exc.details), status_code=exc.status)

    @app.exception_handler(RequestValidationError)
    async def _validation(_: Request, exc: RequestValidationError):
        details = [
            {"loc": [str(x) for x in e.get("loc", [])][1:], "msg": e.get("msg")} for e in exc.errors()
        ]
        return JSONResponse(
            _body("validation_error", "Some fields are invalid", details), status_code=422
        )

    @app.exception_handler(StarletteHTTPException)
    async def _http(_: Request, exc: StarletteHTTPException):
        code = {401: "unauthorized", 403: "forbidden", 404: "not_found", 405: "method_not_allowed"}
        return JSONResponse(
            _body(code.get(exc.status_code, "http_error"), str(exc.detail)),
            status_code=exc.status_code,
        )

    @app.exception_handler(Exception)
    async def _unhandled(_: Request, exc: Exception):
        log.exception("Unhandled error", exc_info=exc)
        return JSONResponse(_body("internal_error", "Something went wrong"), status_code=500)
