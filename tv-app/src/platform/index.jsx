import { platformApi as browserApi } from './browser'
import { platformApi as tizenApi } from './tizen'
import { platformApi as webosApi } from './webos'
import { platformApi as androidtvApi } from './androidtv'

const platform = import.meta.env.VITE_PLATFORM || 'browser'

const apis = {
  browser: browserApi,
  tizen: tizenApi,
  webos: webosApi,
  androidtv: androidtvApi,
}

export const platformApi = apis[platform] || browserApi
