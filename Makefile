.PHONY: dev build start electron-dev electron electron-pack

dev:
	cd web && bun run dev

electron-dev:
	npm run electron:dev

electron:
	npm run electron:start

electron-pack:
	npm run electron:pack
