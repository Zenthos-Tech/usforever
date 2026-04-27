import { User } from '../models/User';
import { Wedding } from '../models/Wedding';

export type OwnershipResult =
  | { ok: true; weddingId: string; wedding: any }
  | { ok: false; status: 403 | 404; error: string };

/**
 * Resolve the wedding referenced by either weddingId or phone, then verify
 * that the authenticated user (linked via User.contact_no === Wedding.phone)
 * owns it. Used by every handler that mutates or reveals wedding-scoped
 * data — face search, wedding profile, album CRUD.
 */
export async function loadOwnedWedding(
  userId: string,
  selector: { weddingId?: string; phone?: string }
): Promise<OwnershipResult> {
  const user = await User.findById(userId).select('contact_no').lean();
  if (!user || !user.contact_no) return { ok: false, status: 403, error: 'Forbidden' };

  let wedding;
  if (selector.weddingId) wedding = await Wedding.findById(selector.weddingId).lean();
  else if (selector.phone) wedding = await Wedding.findOne({ phone: selector.phone }).lean();

  if (!wedding) return { ok: false, status: 404, error: 'Wedding not found' };
  if (String(wedding.phone) !== String(user.contact_no)) {
    return { ok: false, status: 403, error: 'Forbidden' };
  }
  return { ok: true, weddingId: String(wedding._id), wedding };
}
