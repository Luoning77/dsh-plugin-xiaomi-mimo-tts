/** Verified against the official 2.0 catalog on 2026-10-19.
 * Curated selection of 30 distinctive bidirectional voices. Custom IDs remain available.
 */
export const DOUBAO_VOICE_CATALOG_SOURCE = 'https://docs.volcengine.com/docs/DoubaoVoice/Tonelist-1?lang=zh'
export const DOUBAO_VOICE_CATALOG_CHECKED = '2026-10-19'

const voices = [
  ['Vivi 2.0', 'zh_female_vv_uranus_bigtts', '通用'],
  ['知性灿灿 2.0', 'zh_female_cancan_uranus_bigtts', '角色'],
  ['撒娇学妹 2.0', 'zh_female_sajiaoxuemei_uranus_bigtts', '角色'],
  ['爽快思思 2.0', 'zh_female_shuangkuaisisi_uranus_bigtts', '通用'],
  ['少年梓辛 2.0', 'zh_male_shaonianzixin_uranus_bigtts', '通用'],
  ['猴哥 2.0', 'zh_male_sunwukong_uranus_bigtts', '配音'],
  ['黑猫侦探社咪仔 2.0', 'zh_female_mizai_uranus_bigtts', '配音'],
  ['儒雅逸辰 2.0', 'zh_male_ruyayichen_uranus_bigtts', '配音'],
  ['TVB女声 2.0', 'zh_female_tvbnv_uranus_bigtts', '通用'],
  ['四郎 2.0', 'zh_male_silang_uranus_bigtts', '角色'],
  ['熊二 2.0', 'zh_male_xionger_uranus_bigtts', '角色'],
  ['樱桃丸子 2.0', 'zh_female_yingtaowanzi_uranus_bigtts', '角色'],
  ['高冷御姐 2.0', 'zh_female_gaolengyujie_uranus_bigtts', '通用'],
  ['傲娇霸总 2.0', 'zh_male_aojiaobazong_uranus_bigtts', '通用'],
  ['悬疑解说 2.0', 'zh_male_xuanyijieshuo_uranus_bigtts', '阅读'],
  ['小何 2.0', 'zh_female_xiaohe_uranus_bigtts', '通用'],
  ['云舟 2.0', 'zh_male_m191_uranus_bigtts', '通用'],
  ['小天 2.0', 'zh_male_taocheng_uranus_bigtts', '通用'],
  ['清澈梓梓 2.0', 'zh_female_qingchezizi_uranus_bigtts', '通用'],
  ['女雷神 2.0', 'zh_female_nvleishen_uranus_bigtts', '角色'],
  ['直率英子 2.0', 'zh_female_zhishuaiyingzi_uranus_bigtts', '角色'],
  ['谄媚女声 2.0', 'zh_female_chanmeinv_uranus_bigtts', '通用'],
  ['玲玲姐姐 2.0', 'zh_female_lingling_uranus_bigtts', '角色'],
  ['娇喘女声 2.0', 'zh_female_jiaochuannv_uranus_bigtts', '通用'],
  ['鲁班七号 2.0', 'zh_male_lubanqihao_uranus_bigtts', '角色'],
  ['春日部姐姐 2.0', 'zh_female_chunribu_uranus_bigtts', '角色'],
  ['温柔妈妈 2.0', 'zh_female_wenroumama_uranus_bigtts', '通用'],
  ['霸气青叔 2.0', 'zh_male_baqiqingshu_uranus_bigtts', '阅读'],
  ['深夜播客 2.0', 'zh_male_shenyeboke_uranus_bigtts', '通用'],
  ['儿童绘本 2.0', 'zh_female_xiaoxue_uranus_bigtts', '阅读'],
] as const

export const DOUBAO_VOICE_PRESETS = voices.map(([name, value, scene]) => ({
  name, value, scene, language: '中文 / Chinese',
  resourceId: 'seed-tts-2.0' as const, bidirectional: true as const,
}))
