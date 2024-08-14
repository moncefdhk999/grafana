package loginattempt

import (
	"context"
)

type Service interface {
	// Add adds a new login attempt record for provided username or email
	Add(ctx context.Context, username, IPAddress string) error
	// ValidateUsername checks if username has to many login attempts inside a window.
	// Will return true if provided username do not have too many attempts.
	ValidateUsername(ctx context.Context, username string) (bool, error)
	// ValidateIP checks if IP address has to many login attempts inside a window.
	// Will return true if provided IP Address do not have too many attempts.
	ValidateIPAddress(ctx context.Context, IPAddress string) (bool, error)
	// Reset resets all login attempts attached to username
	Reset(ctx context.Context, username string) error
}

type LoginAttempt struct {
	Id        int64
	Username  string
	IpAddress string
	Created   int64
}
